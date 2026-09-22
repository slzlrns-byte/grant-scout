// 사용법: node scripts/sync_decisions.js [data/_decisions/decisions]
// 검토판 아티팩트 DB의 decisions 컬렉션(ArtifactData list → out_dir 로 저장된 JSON 파일들)을
// data/decisions.json 으로 합친다. 주간 스캔은 이 파일로 기신청 공고를 제외하고, 미신청 사유를 분석한다.
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const dir = path.resolve(ROOT, process.argv[2] || "data/_decisions/decisions");
const out = path.join(ROOT, "data", "decisions.json");

let prev = { applied: [], declined: [], synced_at: null };
if (fs.existsSync(out)) prev = JSON.parse(fs.readFileSync(out, "utf8"));

const docs = [];
const exported = path.join(ROOT, "data", "decisions_export.json"); // 검토판 "신청 기록 내보내기" 파일을 여기에 두면 함께 반영
if (fs.existsSync(exported)) { const x = JSON.parse(fs.readFileSync(exported, "utf8")); (x.decisions || []).forEach((d) => docs.push(d)); }
if (fs.existsSync(dir)) {
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    let d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    if (d.data && typeof d.data === "object" && !d.decision) d = d.data;
    if (d && d.url && d.decision) docs.push(d);
  }
}
if (!docs.length) {
  console.log("동기화할 결정 없음 (기존 파일 유지: 신청 " + prev.applied.length + "건, 미신청 " + prev.declined.length + "건)");
  process.exit(0);
}
const norm = (u) => String(u || "").trim().replace(/\/$/, "");
const byUrl = new Map();
for (const d of docs) byUrl.set(norm(d.url), d); // 같은 공고에 대한 최신 결정 1건
const applied = [], declined = [];
for (const d of byUrl.values()) {
  const rec = { url: norm(d.url), title: d.title || "", agency: d.agency || "", category: d.category || "", decided_at: d.decided_at || "", report_date: d.report_date || "" };
  if (d.decision === "applied") applied.push(rec);
  else if (d.decision === "declined") declined.push({ ...rec, reason: d.reason || "" });
}
fs.writeFileSync(out, JSON.stringify({ applied, declined, synced_at: new Date().toISOString() }, null, 2) + "\n");
console.log(`decisions.json 갱신: 신청 ${applied.length}건, 미신청 ${declined.length}건`);
