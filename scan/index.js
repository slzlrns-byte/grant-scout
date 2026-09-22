#!/usr/bin/env node
// 주간 파이프라인 (토큰 절약형)
//   조건·신청이력 로드 → 목록 수집 → 코드 필터(지역·키워드·기신청·최근 4주 중복) → [API 1단계] triage
//   → 살아남은 후보만 상세 수집 → [API 2단계] 분석 → data/YYYY-MM-DD.json → 엑셀
// 사용법: node scan/index.js [--dry-run] [--date YYYY-MM-DD] [--max-detail N]
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { collectListings, fetchDetails } = require("./fetch");
const { triage, analyze } = require("./analyze");

const ROOT = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const DRY = args.includes("--dry-run");
const today = flag("--date", new Date().toISOString().slice(0, 10));
const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);

// .env 로드 (dotenv 없이)
const envPath = path.join(ROOT, ".env");
if (fs.existsSync(envPath)) for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) { const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, ""); }
const MAX_DETAIL = Number(flag("--max-detail", process.env.GRANT_SCOUT_MAX_DETAIL || 40));
const BODY_CHARS = Number(process.env.GRANT_SCOUT_BODY_CHARS || 900);

const site = JSON.parse(fs.readFileSync(path.join(ROOT, "config", "site.json"), "utf8"));
const profile = JSON.parse(fs.readFileSync(path.join(ROOT, "config", "company_profile.json"), "utf8"));
const norm = (u) => String(u || "").trim().replace(/\/+$/, "");
const toDate = (s) => { const m = String(s || "").match(/(\d{4})[.\-](\d{2})[.\-](\d{2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };

// 1) 신청 이력
try { execFileSync("node", [path.join(ROOT, "scripts", "sync_decisions.js")], { stdio: "inherit" }); } catch (e) { log("신청 이력 동기화 건너뜀"); }
const decPath = path.join(ROOT, "data", "decisions.json");
const decisions = fs.existsSync(decPath) ? JSON.parse(fs.readFileSync(decPath, "utf8")) : { applied: [], declined: [] };
const appliedUrls = new Set((decisions.applied || []).map((a) => norm(a.url)));

// 2) 최근 4주 보고 공고 (코드에서 중복 제거: 같은 URL은 다시 보내지 않음. 단 추천·검토였고 마감 14일 이내면 재안내로 남김)
const cutoff = new Date(today); cutoff.setDate(cutoff.getDate() - 28);
const previous = new Map(); // url -> {recommend, deadline}
for (const f of fs.readdirSync(path.join(ROOT, "data")).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))) {
  const d = f.slice(0, 10);
  if (d >= cutoff.toISOString().slice(0, 10) && d < today) {
    const w = JSON.parse(fs.readFileSync(path.join(ROOT, "data", f), "utf8"));
    (w.items || []).forEach((it) => { if (it.url) previous.set(norm(it.url), { recommend: it.recommend, deadline: it.deadline, week: d }); });
  }
}
const todayD = new Date(today);
const isReminder = (p) => { if (!p || !/추천|검토/.test(p.recommend || "")) return false; const dl = toDate(p.deadline); return dl && (dl - todayD) / 86400000 <= 14 && dl >= todayD; };

(async () => {
  // 3) 목록 수집
  const all = await collectListings(site, log);
  const stats = { collected: all.length, region_out: 0, keyword_out: 0, applied_skipped: 0, duplicate_out: 0, triage_out: 0, detail_analyzed: 0 };

  // 4) 코드 필터
  const regions = profile.prefer_regions || ["서울", "전국", "지역 확인 필요"];
  const excl = profile.exclude_keywords || [];
  const kept = [];
  for (const c of all) {
    if (!regions.some((r) => (c.region || "").includes(r))) { stats.region_out++; continue; }
    if (excl.some((k) => (c.title || "").includes(k)) && !/바우처/.test(c.title || "")) { stats.keyword_out++; continue; }
    if (appliedUrls.has(norm(c.url))) { stats.applied_skipped++; continue; }
    const p = previous.get(norm(c.url));
    if (p && !isReminder(p)) { stats.duplicate_out++; continue; }
    if (p) c.reminder = `마감 임박 재안내 (${p.week} 보고)`;
    kept.push(c);
  }
  log(`코드 필터: 지역 ${stats.region_out}, 키워드 ${stats.keyword_out}, 기신청 ${stats.applied_skipped}, 최근 보고 중복 ${stats.duplicate_out} 제외 → ${kept.length}건`);
  fs.mkdirSync(path.join(ROOT, "data", "_candidates"), { recursive: true });
  if (DRY) { fs.writeFileSync(path.join(ROOT, "data", "_candidates", `${today}.json`), JSON.stringify({ stats, candidates: kept }, null, 2)); log(`dry-run: ${kept.length}건을 data/_candidates/${today}.json 에 저장하고 종료 (API 호출 없음)`); return; }

  // 5) API 1단계: 목록 정보로 명백한 제외 걸러내기
  const tri = await triage(kept, profile, log);
  const survivors = kept.filter((c) => tri.get(c.id).keep);
  const dropped = kept.filter((c) => !tri.get(c.id).keep);
  stats.triage_out = dropped.length;
  log(`triage: 제외 ${dropped.length}, 상세 확인 대상 ${survivors.length} (상한 ${MAX_DETAIL})`);

  // 6) 상세 수집 (살아남은 후보만, 상한)
  const target = survivors.slice(0, MAX_DETAIL);
  const overflow = survivors.slice(MAX_DETAIL);
  const detailed = await fetchDetails(site, target, log);
  const candidates = detailed.map((c) => ({
    id: c.id, title: c.title, category: c.category, region: c.region, agency: c.agency, period: c.period, url: c.url, reminder: c.reminder,
    detail: c.detail ? { region: c.detail.region, target: c.detail.target, operator: c.detail.operator, body: (c.detail.body_excerpt || "").slice(0, BODY_CHARS) } : null,
  }));
  stats.detail_analyzed = candidates.length;
  fs.writeFileSync(path.join(ROOT, "data", "_candidates", `${today}.json`), JSON.stringify({ stats, dropped: dropped.map((c) => ({ id: c.id, title: c.title, reason: tri.get(c.id).reason })), candidates }, null, 2));

  // 7) API 2단계: 본격 분석
  const start = new Date(today); start.setDate(start.getDate() - 7);
  const data = await analyze({
    reportDate: today, period: `${start.toISOString().slice(0, 10)} ~ ${today} 등록 공고`, source: `${site.name} (${site.base_url.replace(/^https?:\/\//, "")})`,
    profile, decisions, candidates, prefilterStats: stats,
  }, log);

  // 8) triage 제외분·상한 초과분을 목록에 합친다 (보고서 '전체 검토목록'에 사유와 함께 남기기)
  const asExcluded = (c, reason, eligible) => ({ category: c.category || "", title: c.title || "", agency: c.agency || "", region: c.region || "", period: c.period || "", deadline: (c.period || "").split("~").pop().trim() || "확인 필요", recommend: "제외", fit: "하", score: 0, eligible, eligible_reason: reason, reason, url: c.url || "" });
  dropped.forEach((c) => { const r = tri.get(c.id).reason || "목록 정보 기준 제외"; data.items.push(asExcluded(c, "1차 제외: " + r, /전용|특화|마감|해당 없음|포상|입찰|선정결과/.test(r) ? "불가" : "확인 필요")); });
  overflow.forEach((c) => data.items.push(asExcluded(c, "상세 미확인 (주간 상한 초과, 다음 주 재검토)", "확인 필요")));
  data.skipped_applied = (data.skipped_applied || 0) + stats.applied_skipped;
  data.stats = stats;

  const outPath = path.join(ROOT, "data", `${today}.json`);
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2) + "\n");
  log(`저장: data/${today}.json (items ${data.items.length}건, 상세 분석 ${candidates.length}건)`);

  // 9) 엑셀
  execFileSync("node", [path.join(ROOT, "scripts", "export_excel.js"), `data/${today}.json`], { stdio: "inherit", cwd: ROOT });
})().catch((e) => { console.error(e); process.exit(1); });
