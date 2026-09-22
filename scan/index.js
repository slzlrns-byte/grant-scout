#!/usr/bin/env node
// 주간 파이프라인: 조건·신청이력 로드 → 목록 수집 → 1차 필터 → 상세 수집 → Claude 분석 → data/YYYY-MM-DD.json → 엑셀
// 사용법: node scan/index.js [--dry-run] [--date YYYY-MM-DD] [--max-detail N]
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { collectListings, fetchDetails } = require("./fetch");
const { analyze } = require("./analyze");

const ROOT = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const DRY = args.includes("--dry-run");
const today = flag("--date", new Date().toISOString().slice(0, 10));
const MAX_DETAIL = Number(flag("--max-detail", process.env.GRANT_SCOUT_MAX_DETAIL || 120));
const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);

// .env 로드 (dotenv 없이)
const envPath = path.join(ROOT, ".env");
if (fs.existsSync(envPath)) for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) { const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, ""); }

const site = JSON.parse(fs.readFileSync(path.join(ROOT, "config", "site.json"), "utf8"));
const profile = JSON.parse(fs.readFileSync(path.join(ROOT, "config", "company_profile.json"), "utf8"));

// 1) 신청 이력
try { execFileSync("node", [path.join(ROOT, "scripts", "sync_decisions.js")], { stdio: "inherit" }); } catch (e) { log("신청 이력 동기화 건너뜀"); }
const decPath = path.join(ROOT, "data", "decisions.json");
const decisions = fs.existsSync(decPath) ? JSON.parse(fs.readFileSync(decPath, "utf8")) : { applied: [], declined: [] };
const appliedUrls = new Set((decisions.applied || []).map((a) => String(a.url).trim()));

// 2) 최근 4주 보고 공고명 (중복 제외용)
const cutoff = new Date(today); cutoff.setDate(cutoff.getDate() - 28);
const previousTitles = [];
for (const f of fs.readdirSync(path.join(ROOT, "data")).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))) {
  const d = f.slice(0, 10); if (d >= cutoff.toISOString().slice(0, 10) && d < today) {
    const w = JSON.parse(fs.readFileSync(path.join(ROOT, "data", f), "utf8"));
    (w.items || []).forEach((it) => previousTitles.push({ title: it.title, url: it.url, recommend: it.recommend, deadline: it.deadline, week: d }));
  }
}

(async () => {
  // 3) 목록 수집
  const all = await collectListings(site, log);
  log(`수집 ${all.length}건`);

  // 4) 1차 필터: 지역, 제외 키워드, 기신청
  const regions = profile.prefer_regions || ["서울", "전국", "지역 확인 필요"];
  const excl = profile.exclude_keywords || [];
  const stats = { collected: all.length, region_out: 0, keyword_out: 0, applied_skipped: 0, kept: 0 };
  const kept = [];
  for (const c of all) {
    const region = c.region || "";
    if (!regions.some((r) => region.includes(r))) { stats.region_out++; continue; }
    if (excl.some((k) => (c.title || "").includes(k) && !/바우처/.test(c.title || ""))) { stats.keyword_out++; continue; }
    if (appliedUrls.has(String(c.url).trim())) { stats.applied_skipped++; continue; }
    kept.push(c);
  }
  stats.kept = kept.length;
  log(`1차 필터: 지역 제외 ${stats.region_out}, 키워드 제외 ${stats.keyword_out}, 기신청 제외 ${stats.applied_skipped}, 남은 후보 ${kept.length}`);

  // 5) 상세 수집 (최신순 우선, 상한)
  const target = kept.slice(0, MAX_DETAIL);
  const detailed = await fetchDetails(site, target, log);
  const candidates = detailed.map((c) => ({
    id: c.id, title: c.title, category: c.category, region: c.region, agency: c.agency, status: c.status, period: c.period, dday: c.dday, url: c.url, found_by: c.found_by,
    detail: c.detail ? { region: c.detail.region, target: c.detail.target, agency: c.detail.agency, operator: c.detail.operator, posted: c.detail.posted, attachments: c.detail.attachments.slice(0, 4), body: c.detail.body_excerpt } : null,
  }));
  fs.mkdirSync(path.join(ROOT, "data", "_candidates"), { recursive: true });
  fs.writeFileSync(path.join(ROOT, "data", "_candidates", `${today}.json`), JSON.stringify({ stats, candidates }, null, 2));
  if (DRY) { log(`dry-run: 후보 ${candidates.length}건을 data/_candidates/${today}.json 에 저장하고 종료`); return; }

  // 6) 분석
  const start = new Date(today); start.setDate(start.getDate() - 7);
  const data = await analyze({
    reportDate: today, period: `${start.toISOString().slice(0, 10)} ~ ${today} 등록 공고`, source: `${site.name} (${site.base_url.replace(/^https?:\/\//, "")})`,
    profile, decisions, candidates, previousTitles, prefilterStats: stats,
  }, log);
  data.skipped_applied = (data.skipped_applied || 0) + stats.applied_skipped;
  const outPath = path.join(ROOT, "data", `${today}.json`);
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2) + "\n");
  log(`저장: data/${today}.json (items ${data.items.length}건)`);

  // 7) 엑셀
  execFileSync("node", [path.join(ROOT, "scripts", "export_excel.js"), `data/${today}.json`], { stdio: "inherit", cwd: ROOT });
})().catch((e) => { console.error(e); process.exit(1); });
