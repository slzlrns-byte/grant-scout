// Claude API로 후보 공고를 분석해 주간 JSON(data/SCHEMA.md)을 만든다.
const fs = require("fs");
const path = require("path");
const Anthropic = require("@anthropic-ai/sdk");

const ROOT = path.resolve(__dirname, "..");
const MODEL = process.env.GRANT_SCOUT_MODEL || "claude-opus-5";

function extractJson(text) {
  const s = text.indexOf("{"), e = text.lastIndexOf("}");
  if (s < 0 || e < 0) throw new Error("응답에서 JSON을 찾지 못했습니다");
  return JSON.parse(text.slice(s, e + 1));
}

/**
 * @param {object} input  { reportDate, period, source, profile, decisions, candidates, previousTitles, prefilterStats }
 * @returns {Promise<object>} 주간 JSON
 */
async function analyze(input, log = console.log) {
  const client = new Anthropic(); // ANTHROPIC_API_KEY 또는 `ant auth login` 프로필
  const system = fs.readFileSync(path.join(ROOT, "prompts", "analyst.md"), "utf8");

  const profile = { ...input.profile };
  delete profile.finance; // 재무 수치는 API로 보내지 않는다 (finance.notes 만 판단 힌트로 전달)
  const financeNotes = (input.profile.finance && input.profile.finance.notes) || [];

  const user = [
    `# 보고 기준\nreport_date: ${input.reportDate}\nperiod: ${input.period}\nsource: ${input.source}`,
    `# 회사 조건\n${JSON.stringify({ ...profile, finance_notes: financeNotes }, null, 1)}`,
    `# 신청 이력\napplied(기신청, url 일치 시 제외): ${JSON.stringify(input.decisions.applied || [])}\ndeclined(미신청+사유): ${JSON.stringify(input.decisions.declined || [])}`,
    `# 최근 4주에 이미 보고한 공고명 (마감 14일 이내 추천이 아니면 제외)\n${JSON.stringify(input.previousTitles || [])}`,
    `# 1차 필터 통계\n${JSON.stringify(input.prefilterStats || {})}`,
    `# 후보 공고 (${input.candidates.length}건)\n${JSON.stringify(input.candidates)}`,
  ].join("\n\n");

  log(`Claude 분석 요청: 후보 ${input.candidates.length}건, 모델 ${MODEL}`);
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 64000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "high" },
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: user }],
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === "refusal") throw new Error("모델이 요청을 거부했습니다: " + JSON.stringify(msg.stop_details || {}));
  if (msg.stop_reason === "max_tokens") log("경고: 출력이 max_tokens 에서 잘렸습니다. 후보 수를 줄이세요.");
  const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  log(`토큰: in ${msg.usage.input_tokens} (cache read ${msg.usage.cache_read_input_tokens || 0}) / out ${msg.usage.output_tokens}`);
  const data = extractJson(text);
  data.report_date = data.report_date || input.reportDate;
  data.items = Array.isArray(data.items) ? data.items : [];
  return data;
}

module.exports = { analyze };
