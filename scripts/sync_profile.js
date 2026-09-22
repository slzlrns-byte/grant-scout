// 사용법: node scripts/sync_profile.js <조건관리 페이지에서 받은 JSON 파일>
// 조건 관리 아티팩트의 DB 문서(profile/company)를 config/company_profile.json 에 병합한다.
// 재무(finance) 등 파일에만 있는 항목은 유지하고, 페이지에서 편집 가능한 항목만 덮어쓴다.
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const src = process.argv[2];
if (!src) {
  console.error("사용법: node scripts/sync_profile.js <json 파일>");
  process.exit(1);
}
const cfgPath = path.join(ROOT, "config", "company_profile.json");
const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
let doc = JSON.parse(fs.readFileSync(path.resolve(ROOT, src), "utf8"));
if (doc.data && typeof doc.data === "object" && !doc.company_name) doc = doc.data; // ArtifactData 결과 래핑 대응

const EDITABLE = [
  "company_name", "industry", "business_type", "employees", "size_class", "location", "district",
  "founded_year", "business_age_years", "interests", "certifications", "exclude_rules", "exclude_keywords",
  "prefer_regions", "facts", "notes", "reporter", "department", "updated_at",
];
let changed = [];
for (const k of EDITABLE) {
  if (doc[k] === undefined) continue;
  if (JSON.stringify(doc[k]) !== JSON.stringify(cfg[k])) changed.push(k);
  cfg[k] = doc[k];
}
if (cfg.founded_year) cfg.business_age_years = new Date().getFullYear() - Number(cfg.founded_year);
fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + "\n");
console.log(changed.length ? "프로필 갱신: " + changed.join(", ") : "프로필 변경 없음");
