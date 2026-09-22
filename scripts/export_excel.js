// 사용법: node scripts/export_excel.js data/2026-09-26.json
// data JSON 스키마는 data/SCHEMA.md 참고. 결과: reports/지원사업_검토보고_YYYY-MM-DD.xlsx
const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");

const ROOT = path.resolve(__dirname, "..");
const input = process.argv[2];
if (!input) {
  console.error("사용법: node scripts/export_excel.js data/<날짜>.json");
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(path.resolve(ROOT, input), "utf8"));
const profile = JSON.parse(fs.readFileSync(path.join(ROOT, "config", "company_profile.json"), "utf8"));

const reportDate = data.report_date || new Date().toISOString().slice(0, 10);
const summaryText = Array.isArray(data.summary_points) && data.summary_points.length ? data.summary_points.map((s) => "• " + s).join("\n") : data.summary || "";
const stepLine = (s) => (typeof s === "string" ? s : `${s.task || ""}${s.owner ? " (담당: " + s.owner + ")" : ""}${s.due ? " [기한: " + s.due + "]" : ""}`);
const conclusionText = [
  Array.isArray(data.opinion_points) && data.opinion_points.length ? data.opinion_points.map((s, i) => `${i + 1}) ${s}`).join("\n") : data.conclusion || "",
  Array.isArray(data.next_steps) && data.next_steps.length ? "\n[향후 계획]\n" + data.next_steps.map((s, i) => `${i + 1}. ${stepLine(s)}`).join("\n") : "",
].join("\n").trim();
const items = data.items || [];
const recommended = items.filter((i) => i.recommend === "추천" || i.recommend === "검토");
const excluded = items.filter((i) => !(i.recommend === "추천" || i.recommend === "검토"));

const wb = new ExcelJS.Workbook();
wb.creator = profile.reporter || "SF Grant Scout";
wb.created = new Date();

// 공통 스타일
const HEADER_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F3864" } };
const HEADER_FONT = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
const TITLE_FONT = { bold: true, size: 16 };
const thin = { style: "thin", color: { argb: "FFBFBFBF" } };
const BORDER = { top: thin, left: thin, bottom: thin, right: thin };
const WRAP = { vertical: "top", wrapText: true };
const CENTER = { vertical: "middle", horizontal: "center", wrapText: true };

function styleHeaderRow(row) {
  row.eachCell((c) => {
    c.fill = HEADER_FILL;
    c.font = HEADER_FONT;
    c.alignment = CENTER;
    c.border = BORDER;
  });
  row.height = 28;
}
function styleBodyRow(row) {
  row.eachCell({ includeEmpty: true }, (c) => {
    c.alignment = WRAP;
    c.border = BORDER;
    c.font = { size: 10 };
  });
}
function eligColor(e) {
  if (e === "가능") return "FFC6EFCE";
  if (e === "확인 필요") return "FFFFEB9C";
  if (e === "불가") return "FFFFC7CE";
  return null;
}
function fitColor(fit) {
  if (fit === "상") return "FFC6EFCE";
  if (fit === "중") return "FFFFEB9C";
  if (fit === "하") return "FFFFC7CE";
  return null;
}

// ───────────────────────── 시트 1: 검토 보고 요약 ─────────────────────────
{
  const ws = wb.addWorksheet("검토보고 요약");
  ws.columns = [{ width: 22 }, { width: 60 }, { width: 22 }, { width: 30 }];

  ws.mergeCells("A1:D1");
  ws.getCell("A1").value = "정부·지자체 지원사업 주간 검토 보고";
  ws.getCell("A1").font = TITLE_FONT;
  ws.getCell("A1").alignment = { vertical: "middle", horizontal: "center" };
  ws.getRow(1).height = 36;

  const meta = [
    ["보고일자", reportDate, "작성부서 / 작성자", `${profile.department || ""} / ${profile.reporter || ""}`],
    ["검토기간", data.period || `${reportDate} 기준 최근 1주`, "출처", data.source || "Subsidy Pick Guide (subsidy-spg.vercel.app)"],
    ["검토 공고 수", `${items.length}건`, "추천/검토 대상", `${recommended.length}건`],
    ["신청 가능 여부", `가능 ${items.filter((i) => i.eligible === "가능").length}건 · 확인 필요 ${items.filter((i) => i.eligible === "확인 필요").length}건 · 불가 ${items.filter((i) => i.eligible === "불가").length}건`, "", ""],
  ];
  meta.forEach((r, i) => {
    const row = ws.getRow(3 + i);
    if (i === 3) ws.mergeCells(`B${3 + i}:D${3 + i}`);
    row.values = r;
    [1, 3].forEach((col) => {
      const c = row.getCell(col);
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E1F2" } };
      c.font = { bold: true, size: 10 };
    });
    styleBodyRow(row);
  });

  let r = 8;
  ws.getCell(`A${r}`).value = "1. 회사 기본 정보 (적합성 판단 기준)";
  ws.getCell(`A${r}`).font = { bold: true, size: 12 };
  r++;
  const prof = [
    ["회사명", profile.company_name, "업종", profile.industry],
    ["소재지", profile.location, "설립연도 / 업력", `${profile.founded_year}년 / ${profile.business_age_years}년차`],
    ["직원 수", `${profile.employees}명 내외`, "기업 규모", profile.size_class],
  ];
  const fin = profile.finance;
  const won = (v) => (typeof v === "number" ? `${(v / 100000000).toFixed(1)}억원` : "-");
  if (fin) {
    prof.push([
      `매출액 (FY${fin.fiscal_year})`,
      won(fin.revenue_krw),
      "영업이익 / 당기순이익",
      `${won(fin.operating_income_krw)} / ${won(fin.net_income_krw)}`,
    ]);
    prof.push(["자산 / 부채 / 자본", `${won(fin.total_assets_krw)} / ${won(fin.total_liabilities_krw)} / ${won(fin.total_equity_krw)}`, "부채비율", `${fin.debt_ratio_pct}%`]);
  }
  const certs = (profile.certifications || []);
  const certLine = (st) => certs.filter((c) => c.status === st).map((c) => c.name).join(", ") || "-";
  prof.push(["인증 보유", certLine("보유"), "인증 미보유 / 미확인", `미보유: ${certLine("미보유")}\n미확인: ${certLine("미확인")}`]);
  prof.push(["관심 분야", (profile.interests || []).join("\n"), "", ""]);
  prof.forEach((vals) => {
    const row = ws.getRow(r++);
    row.values = vals;
    [1, 3].forEach((col) => {
      const c = row.getCell(col);
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
      c.font = { bold: true, size: 10 };
    });
    styleBodyRow(row);
  });
  ws.mergeCells(`B${r - 1}:D${r - 1}`);
  ws.getRow(r - 1).height = 64;
  ws.getRow(r - 2).height = 44;

  r++;
  ws.getCell(`A${r}`).value = "2. 금주 핵심 요약";
  ws.getCell(`A${r}`).font = { bold: true, size: 12 };
  r++;
  ws.mergeCells(`A${r}:D${r}`);
  ws.getCell(`A${r}`).value = summaryText || "(요약 없음)";
  ws.getCell(`A${r}`).alignment = WRAP;
  ws.getCell(`A${r}`).border = BORDER;
  ws.getRow(r).height = Math.max(60, (summaryText.split("\n").length + Math.ceil(summaryText.length / 70)) * 16);
  r += 2;

  ws.getCell(`A${r}`).value = "3. 추천 공고 목록 (우선순위순)";
  ws.getCell(`A${r}`).font = { bold: true, size: 12 };
  r++;
  const h = ws.getRow(r++);
  h.values = ["우선순위 / 적합도", "공고명", "마감일", "추진 의견"];
  styleHeaderRow(h);
  recommended
    .slice()
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .forEach((it, idx) => {
      const row = ws.getRow(r++);
      row.values = [
        `${idx + 1}순위 / ${it.fit || "-"} (${it.score ?? "-"}점)`,
        it.title,
        it.deadline || "-",
        it.opinion || "",
      ];
      styleBodyRow(row);
      const col = fitColor(it.fit);
      if (col) row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: col } };
    });
  if (recommended.length === 0) {
    const row = ws.getRow(r++);
    row.values = ["-", "금주 추천 대상 공고 없음", "-", "-"];
    styleBodyRow(row);
  }

  r++;
  ws.getCell(`A${r}`).value = "4. 종합 의견 및 향후 계획";
  ws.getCell(`A${r}`).font = { bold: true, size: 12 };
  r++;
  ws.mergeCells(`A${r}:D${r}`);
  ws.getCell(`A${r}`).value = conclusionText;
  ws.getCell(`A${r}`).alignment = WRAP;
  ws.getCell(`A${r}`).border = BORDER;
  ws.getRow(r).height = Math.max(60, (conclusionText.split("\n").length + Math.ceil(conclusionText.length / 70)) * 16);

  ws.pageSetup = { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
}

// ───────────────────────── 시트 2: 추천 공고 상세 (타당성 분석) ─────────────────────────
{
  const ws = wb.addWorksheet("추천공고 타당성분석");
  const cols = [
    ["No", 5],
    ["분야", 11],
    ["공고명", 38],
    ["주관기관", 16],
    ["접수기간", 16],
    ["마감일", 11],
    ["지원내용 / 지원규모", 30],
    ["지원자격 (핵심 요건)", 30],
    ["신청 가능", 9],
    ["가능 여부 근거", 26],
    ["적합도", 8],
    ["타당성 점수", 9],
    ["① 자격 적합성", 30],
    ["② 기대효과", 30],
    ["③ 리스크·준비부담", 30],
    ["추진 의견", 28],
    ["필요 준비사항 / 서류", 28],
    ["원문 링크", 30],
  ];
  ws.columns = cols.map(([header, width]) => ({ header, width }));
  styleHeaderRow(ws.getRow(1));
  ws.views = [{ state: "frozen", ySplit: 1 }];

  recommended
    .slice()
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .forEach((it, idx) => {
      const row = ws.addRow([
        idx + 1,
        it.category || "",
        it.title || "",
        it.agency || "",
        it.period || "",
        it.deadline || "",
        it.support || "",
        it.eligibility || "",
        it.eligible || "",
        it.eligible_reason || "",
        it.fit || "",
        it.score ?? "",
        it.analysis?.eligibility || "",
        it.analysis?.benefit || "",
        it.analysis?.risk || "",
        it.opinion || "",
        it.preparation || "",
        it.url || "",
      ]);
      styleBodyRow(row);
      row.getCell(1).alignment = CENTER;
      [9, 11, 12].forEach((c) => (row.getCell(c).alignment = CENTER));
      const col = fitColor(it.fit);
      if (col) row.getCell(11).fill = { type: "pattern", pattern: "solid", fgColor: { argb: col } };
      const ec = eligColor(it.eligible);
      if (ec) row.getCell(9).fill = { type: "pattern", pattern: "solid", fgColor: { argb: ec } };
      if (it.url) {
        row.getCell(18).value = { text: it.url, hyperlink: it.url };
        row.getCell(18).font = { color: { argb: "FF0563C1" }, underline: true, size: 10 };
      }
      row.height = 120;
    });
  ws.autoFilter = { from: "A1", to: "R1" };
  ws.pageSetup = { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
}

// ───────────────────────── 시트 3: 전체 검토 목록 ─────────────────────────
{
  const ws = wb.addWorksheet("전체 검토목록");
  const cols = [
    ["No", 5],
    ["분야", 11],
    ["공고명", 45],
    ["주관기관", 18],
    ["지역", 10],
    ["마감일", 11],
    ["신청 가능", 9],
    ["가능 여부 근거", 34],
    ["판정", 8],
    ["적합도", 8],
    ["점수", 7],
    ["판정 사유 (한 줄)", 50],
    ["원문 링크", 30],
  ];
  ws.columns = cols.map(([header, width]) => ({ header, width }));
  styleHeaderRow(ws.getRow(1));
  ws.views = [{ state: "frozen", ySplit: 1 }];

  const all = [...recommended, ...excluded];
  all.forEach((it, idx) => {
    const row = ws.addRow([
      idx + 1,
      it.category || "",
      it.title || "",
      it.agency || "",
      it.region || "",
      it.deadline || "",
      it.eligible || "",
      it.eligible_reason || "",
      it.recommend || "제외",
      it.fit || "",
      it.score ?? "",
      it.reason || it.opinion || "",
      it.url || "",
    ]);
    styleBodyRow(row);
    [1, 7, 9, 10, 11].forEach((c) => (row.getCell(c).alignment = CENTER));
    const col = fitColor(it.fit);
    if (col) row.getCell(10).fill = { type: "pattern", pattern: "solid", fgColor: { argb: col } };
    const ec = eligColor(it.eligible);
    if (ec) row.getCell(7).fill = { type: "pattern", pattern: "solid", fgColor: { argb: ec } };
    if (it.recommend === "추천") row.getCell(9).font = { bold: true, color: { argb: "FF006100" }, size: 10 };
    if (it.url) {
      row.getCell(13).value = { text: it.url, hyperlink: it.url };
      row.getCell(13).font = { color: { argb: "FF0563C1" }, underline: true, size: 10 };
    }
  });
  ws.autoFilter = { from: "A1", to: "M1" };
  ws.pageSetup = { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
}

fs.mkdirSync(path.join(ROOT, "reports"), { recursive: true });
const out = path.join(ROOT, "reports", `${reportDate.replace(/-/g, "").slice(2)}_지원사업검토내역.xlsx`);
wb.xlsx.writeFile(out).then(() => {
  console.log("생성 완료:", out);
  console.log(`검토 ${items.length}건 / 추천·검토 ${recommended.length}건 / 제외 ${excluded.length}건`);
});
