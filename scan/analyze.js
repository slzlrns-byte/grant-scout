// Claude API 분석 (2단계, 토큰 절약형)
//  1) triage : 목록 정보만으로 명백한 제외를 걸러낸다  — 입력 작음(후보당 ~60토큰), 출력 작음(후보당 ~20토큰)
//  2) analyze: 살아남은 후보의 상세(자격요건 본문)만 보내 신청 가능 여부·점수·의견을 쓴다
const fs = require("fs");
const path = require("path");
const Anthropic = require("@anthropic-ai/sdk");

const ROOT = path.resolve(__dirname, "..");
const MODEL = process.env.GRANT_SCOUT_MODEL || "claude-opus-5";
const TRIAGE_MODEL = process.env.GRANT_SCOUT_TRIAGE_MODEL || MODEL; // 1단계는 더 싼 모델로 바꿔도 됨 (예: claude-sonnet-5)

function extractJson(text) {
  const s = text.indexOf("{"), e = text.lastIndexOf("}");
  if (s < 0 || e < 0) throw new Error("응답에서 JSON을 찾지 못했습니다");
  return JSON.parse(text.slice(s, e + 1));
}

async function call(client, { model, system, user, maxTokens, effort, log }) {
  const stream = client.beta.messages.stream({
    model, max_tokens: maxTokens,
    betas: ["server-side-fallback-2026-07-01"], fallbacks: "default",
    output_config: { effort },
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: user }],
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === "refusal") throw new Error("모델이 요청을 거부했습니다: " + JSON.stringify(msg.stop_details || {}));
  if (msg.stop_reason === "max_tokens") log("경고: 출력이 max_tokens 에서 잘렸습니다.");
  const u = msg.usage;
  log(`토큰 (${model}): in ${u.input_tokens} + cache write ${u.cache_creation_input_tokens || 0} + cache read ${u.cache_read_input_tokens || 0} / out ${u.output_tokens}`);
  return extractJson(msg.content.filter((b) => b.type === "text").map((b) => b.text).join(""));
}

/** 회사 조건에서 판정에 필요한 항목만 (재무 수치 제외) */
function compactProfile(profile) {
  const keys = ["company_name", "industry", "business_type", "employees", "size_class", "location", "district", "founded_year", "certifications", "interests", "exclude_rules", "facts", "prefer_regions"];
  const p = {}; keys.forEach((k) => { if (profile[k] !== undefined) p[k] = profile[k]; });
  p.finance_notes = (profile.finance && profile.finance.notes) || [];
  return p;
}

/** 1단계: 목록 정보만으로 제외 후보 걸러내기. 반환: Map<id, {keep, reason}> */
async function triage(cards, profile, log = console.log) {
  const client = new Anthropic();
  const system = fs.readFileSync(path.join(ROOT, "prompts", "triage.md"), "utf8");
  const compact = cards.map((c) => [c.id, c.title, c.category, c.region, c.agency, c.period || c.status || ""].join(" | "));
  const user = `# 회사 조건 (요약)\n${JSON.stringify({ industry: profile.industry, business_type: profile.business_type, employees: profile.employees, size_class: profile.size_class, location: profile.location + " " + (profile.district || ""), founded_year: profile.founded_year, exclude_rules: profile.exclude_rules, interests: profile.interests }, null, 0)}\n\n# 후보 (id | 공고명 | 분야 | 지역 | 기관 | 접수기간) ${cards.length}건\n${compact.join("\n")}`;
  log(`1단계 triage: ${cards.length}건`);
  const out = await call(client, { model: TRIAGE_MODEL, system, user, maxTokens: 16000, effort: "medium", log });
  const map = new Map();
  (out.items || []).forEach((it) => map.set(String(it.id), { keep: it.keep !== false, reason: it.reason || "" }));
  cards.forEach((c) => { if (!map.has(c.id)) map.set(c.id, { keep: true, reason: "" }); }); // 누락은 안전하게 keep
  return map;
}

/** 2단계: 상세가 있는 후보만 본격 분석. 반환: 주간 JSON (items = 상세 후보만) */
async function analyze(input, log = console.log) {
  const client = new Anthropic();
  const system = fs.readFileSync(path.join(ROOT, "prompts", "analyst.md"), "utf8");
  const user = [
    `# 보고 기준\nreport_date: ${input.reportDate}\nperiod: ${input.period}\nsource: ${input.source}`,
    `# 회사 조건\n${JSON.stringify(compactProfile(input.profile), null, 0)}`,
    `# 신청 이력\napplied: ${JSON.stringify((input.decisions.applied || []).map((a) => ({ url: a.url, title: a.title })))}\ndeclined: ${JSON.stringify((input.decisions.declined || []).map((d) => ({ title: d.title, reason: d.reason })))}`,
    `# 1차·triage 통계 (summary_points 작성용)\n${JSON.stringify(input.prefilterStats || {})}`,
    `# 후보 공고 (${input.candidates.length}건, 상세 포함)\n${JSON.stringify(input.candidates)}`,
  ].join("\n\n");
  log(`2단계 분석: ${input.candidates.length}건, 모델 ${MODEL}`);
  const data = await call(client, { model: MODEL, system, user, maxTokens: 64000, effort: "high", log });
  data.report_date = data.report_date || input.reportDate;
  data.items = Array.isArray(data.items) ? data.items : [];
  return data;
}

module.exports = { triage, analyze };
