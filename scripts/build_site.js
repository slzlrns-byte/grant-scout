// 사용법: node scripts/build_site.js
// data/*.json 전체를 읽어 reports/index.html (흑백 대시보드, 단일 파일)을 생성한다.
// - 추천·검토 공고: "분석 틀" 보기(보고서 양식) / "표" 보기 전환
// - 내보내기: 브라우저에서 직접 엑셀(.xlsx, 3시트) / CSV 생성. 아티팩트에서는 downloads 기능, 로컬 파일에서는 일반 저장.
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const profile = JSON.parse(fs.readFileSync(path.join(ROOT, "config", "company_profile.json"), "utf8"));
const files = fs
  .readdirSync(path.join(ROOT, "data"))
  .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
  .sort()
  .reverse();
const weeks = files.map((f) => {
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, "data", f), "utf8"));
  d.report_date = d.report_date || f.replace(".json", "");
  d.xlsx = `${d.report_date.replace(/-/g, "").slice(2)}_지원사업검토내역.xlsx`;
  return d;
});

const payload = JSON.stringify({ profile, weeks, built: new Date().toISOString() }).replace(/<\/script/gi, "<\\/script");

const html = `<title>SF 지원사업 검토판</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hahmlet:wght@500;600;700&family=Noto+Sans+KR:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
:root{
  --bg:#ffffff; --panel:#f3f3f3; --panel-2:#e9e9e9; --ink:#111111; --ink-2:#4a4a4a; --muted:#7a7a7a;
  --line:#d9d9d9; --line-strong:#111111; --fill-hi:#111111; --on-hi:#ffffff;
  --font:"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif;
  --display:"Hahmlet","Noto Serif KR","Apple Myungjo","Batang",Georgia,serif;
  --mono:"IBM Plex Mono",ui-monospace,Consolas,monospace;
  --label:"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif;
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --bg:#121212; --panel:#1d1d1d; --panel-2:#262626; --ink:#f2f2f2; --ink-2:#c4c4c4; --muted:#8a8a8a;
    --line:#333333; --line-strong:#f2f2f2; --fill-hi:#f2f2f2; --on-hi:#121212;
  }
}
:root[data-theme="dark"]{
  --bg:#121212; --panel:#1d1d1d; --panel-2:#262626; --ink:#f2f2f2; --ink-2:#c4c4c4; --muted:#8a8a8a;
  --line:#333333; --line-strong:#f2f2f2; --fill-hi:#f2f2f2; --on-hi:#121212;
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--font);font-size:14px;line-height:1.55;padding:0 20px;padding-block:0 48px}
a{color:inherit}
.wrap{max-width:1180px;margin:0 auto}
header.top{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:12px 24px;padding-block:28px 18px;border-bottom:2px solid var(--line-strong)}
.brand{display:flex;flex-direction:column;gap:4px}
.brand .eyebrow{font-size:11.5px;letter-spacing:.03em;color:var(--muted);font-family:var(--label);font-weight:500}
.brand h1{margin:0;font-family:var(--display);font-size:28px;font-weight:600;letter-spacing:-.005em;text-wrap:balance}
.meta{font-family:var(--label);font-size:12.5px;color:var(--ink-2);display:flex;gap:18px;flex-wrap:wrap}

.weeks{display:flex;gap:0;flex-wrap:wrap;border-bottom:1px solid var(--line)}
.weeks button{appearance:none;background:none;border:0;border-bottom:2px solid transparent;margin-bottom:-1px;padding:12px 14px;font:inherit;font-family:var(--mono);font-size:13px;color:var(--muted);cursor:pointer}
.weeks button[aria-selected="true"]{color:var(--ink);border-bottom-color:var(--line-strong);font-weight:500}
.weeks button:focus-visible{outline:2px solid var(--ink);outline-offset:-2px}

.kpis{display:grid;grid-template-columns:repeat(5,1fr);border:1px solid var(--line);margin-top:22px}
.kpi{padding:14px 16px;border-right:1px solid var(--line)}
.kpi:last-child{border-right:0}
.kpi .l{font-size:12px;letter-spacing:.02em;color:var(--muted);font-family:var(--label);font-weight:500}
.kpi .v{font-family:var(--display);font-size:32px;font-weight:600;line-height:1.1;margin-top:6px;font-variant-numeric:tabular-nums}
.kpi .v small{font-family:var(--label);font-size:13px;font-weight:400;color:var(--muted);margin-left:3px}
.kpi.hi{background:var(--fill-hi);color:var(--on-hi)} .kpi.hi .l{color:var(--on-hi);opacity:.7} .kpi.hi .v small{color:var(--on-hi);opacity:.7}

section{margin-top:30px}
h2{font-size:12.5px;letter-spacing:.03em;color:var(--muted);font-family:var(--label);font-weight:600;margin:0 0 10px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
h2::after{content:"";flex:1;height:1px;background:var(--line);min-width:24px}
.sumgrid{display:grid;grid-template-columns:1.1fr 1fr;gap:16px}
.sumgrid .card.wide{grid-column:1/-1}
.card{border:1px solid var(--line);padding:16px 18px;background:var(--bg);min-width:0}
.card.tint{background:var(--panel);border-color:transparent}
.card h3{margin:0 0 12px;font-family:var(--display);font-size:15px;font-weight:600;display:flex;align-items:baseline;gap:8px}
.card h3 small{font-family:var(--label);font-size:11.5px;color:var(--muted);font-weight:500}
.pts{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:9px;color:var(--ink-2);font-size:13.5px;line-height:1.6}
.pts li::marker{color:var(--ink);font-weight:600}
.pts li b{color:var(--ink);font-weight:600}
.pts.lead li:first-child{color:var(--ink);font-weight:500}
table.plan{width:100%;border-collapse:collapse;font-size:13px}
table.plan th{padding:6px 6px;font-size:11.5px}
table.plan td{padding:8px 6px;vertical-align:top;color:var(--ink-2);border-bottom:1px solid var(--line)}
table.plan tr:last-child td{border-bottom:0}
table.plan td.t{color:var(--ink);width:70%} table.plan td.d{white-space:nowrap;font-family:var(--mono);font-size:12px} table.plan td.o{white-space:nowrap;font-size:12px}
.toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:14px}
.hist-week{font-family:var(--mono);font-size:12px;white-space:nowrap}
.st{display:inline-block;font-family:var(--label);font-size:11.5px;padding:2px 7px;border:1px solid var(--line);color:var(--ink-2);white-space:nowrap}
.st.open{border-color:var(--ink);color:var(--ink)} .st.closed{color:var(--muted);text-decoration:line-through}
.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;align-items:center}
.btn{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--line-strong);padding:8px 14px;font-size:13px;text-decoration:none;font-weight:500;background:var(--bg);color:var(--ink);cursor:pointer;font-family:inherit;line-height:1.2}
.btn.primary{background:var(--fill-hi);color:var(--on-hi)}
.btn:disabled{opacity:.5;cursor:default}
.btn:focus-visible{outline:2px solid var(--ink);outline-offset:2px}
.btn.sm{padding:5px 10px;font-size:12px}
.path{font-family:var(--label);font-size:11.5px;color:var(--muted);word-break:break-all;margin-top:6px}
.status{font-family:var(--label);font-size:12px;color:var(--muted);min-height:1.2em;margin-top:6px}

.seg{display:inline-flex;border:1px solid var(--line-strong);margin-left:auto}
.seg button{appearance:none;border:0;background:var(--bg);color:var(--ink);font:inherit;font-size:12px;padding:5px 12px;cursor:pointer;font-family:var(--label);font-weight:500}
.seg button[aria-pressed="true"]{background:var(--fill-hi);color:var(--on-hi)}
.seg button:focus-visible{outline:2px solid var(--ink);outline-offset:-2px}

/* 분석 틀 (보고서 양식) */
.frames{display:flex;flex-direction:column;gap:22px}
.frame{border:1.5px solid var(--line-strong)}
.frame .head{display:grid;grid-template-columns:auto 1fr;border-bottom:1.5px solid var(--line-strong)}
.frame .rank{background:var(--fill-hi);color:var(--on-hi);font-family:var(--label);font-size:12px;font-weight:500;padding:12px 14px;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:2px;min-width:74px}
.frame .rank b{font-family:var(--display);font-size:24px;line-height:1;font-weight:600}
.frame .ttl{padding:10px 14px;display:flex;flex-direction:column;gap:6px;min-width:0}
.frame .ttl .name{font-family:var(--display);font-size:18px;font-weight:600;line-height:1.4;text-wrap:balance}
.frame .ttl .tags{display:flex;gap:6px 14px;flex-wrap:wrap;font-family:var(--label);font-size:12.5px;color:var(--ink-2);align-items:center}
.frame table.kv{width:100%;border-collapse:collapse;table-layout:fixed}
.frame table.kv th{width:150px;text-align:left;vertical-align:top;background:var(--panel);font-family:var(--label);letter-spacing:0;text-transform:none;color:var(--ink);font-weight:600;font-size:12.5px;padding:10px 12px;border-bottom:1px solid var(--line);border-right:1px solid var(--line);white-space:normal}
.frame table.kv td{padding:10px 12px;border-bottom:1px solid var(--line);color:var(--ink-2);font-size:13px;vertical-align:top;overflow-wrap:anywhere}
.frame table.kv tr:last-child th,.frame table.kv tr:last-child td{border-bottom:0}
.frame table.kv tr.sec th{background:var(--panel-2);color:var(--ink);font-family:var(--label);font-size:11.5px;letter-spacing:.02em;font-weight:600}
.frame table.kv tr.sec td{background:var(--panel-2);color:var(--muted);font-family:var(--label);font-size:12px}
.frame table.kv td.op{color:var(--ink);font-weight:600}
.frame table.kv td a{font-size:13px}

.tablewrap{overflow-x:auto;border-top:2px solid var(--line-strong)}
table.grid{border-collapse:collapse;width:100%;min-width:760px}
table.grid.wide{min-width:1900px}
th{font-size:12px;letter-spacing:.02em;color:var(--muted);text-align:left;padding:10px 10px;border-bottom:1px solid var(--line);font-weight:600;font-family:var(--label);white-space:nowrap}
td{padding:11px 10px;border-bottom:1px solid var(--line);vertical-align:top}
td.num{font-family:var(--mono);font-variant-numeric:tabular-nums;white-space:nowrap}
td.title{font-family:var(--display);font-weight:600;font-size:14.5px;min-width:240px}
td.title .sub{font-family:var(--font)}
td.title .sub{font-weight:400;color:var(--muted);font-size:12px;margin-top:2px}
td.long{min-width:220px;font-size:12.5px;color:var(--ink-2)}
.fit{display:inline-flex;align-items:center;gap:6px;font-family:var(--label);font-size:12.5px;white-space:nowrap}
.fit i{width:11px;height:11px;border:1.5px solid var(--ink);display:inline-block;flex:none}
.fit.s i{background:var(--ink)}
.fit.m i{background:repeating-linear-gradient(45deg,var(--ink) 0 2px,transparent 2px 4px)}
.fit.l i{background:transparent}
.rec{display:inline-block;font-family:var(--label);font-size:11.5px;letter-spacing:.02em;font-weight:500;padding:2px 8px;border:1px solid var(--ink);white-space:nowrap}
.rec.r{background:var(--fill-hi);color:var(--on-hi);border-color:var(--fill-hi)}
.rec.x{color:var(--muted);border-color:var(--line)}
.el{display:inline-flex;align-items:center;gap:5px;font-family:var(--label);font-size:12px;white-space:nowrap}
.el i{width:9px;height:9px;border-radius:50%;border:1.5px solid var(--ink);display:inline-block;flex:none}
.el.ok i{background:var(--ink)} .el.chk i{background:repeating-linear-gradient(45deg,var(--ink) 0 1.5px,transparent 1.5px 3px)} .el.no i{background:transparent;border-color:var(--muted)}
.el.no{color:var(--muted)}
.rec.na{color:var(--muted);border-style:dashed}
.dec{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.dec .btn.sm{padding:4px 9px;font-size:12px}
.dec .tag{font-family:var(--label);font-size:12px;padding:3px 8px;border:1px solid var(--ink);white-space:nowrap}
.dec .tag.ap{background:var(--fill-hi);color:var(--on-hi)} .dec .tag.dc{color:var(--muted);border-color:var(--line)}
.dec form{display:flex;gap:6px;flex-wrap:wrap;align-items:center;width:100%}
.dec input{font:inherit;font-size:12.5px;padding:5px 8px;border:1px solid var(--line);background:var(--bg);color:var(--ink);flex:1;min-width:180px}
.dec input:focus-visible{outline:2px solid var(--ink);outline-offset:1px}
.dec .why{font-size:12px;color:var(--muted)}
td.decc{min-width:210px}
.insights{background:var(--panel);padding:12px 14px;margin-top:12px;font-size:13px;color:var(--ink-2)}
.insights h4{margin:0 0 4px;font-size:12.5px;color:var(--ink);font-weight:600}
.insights ul{margin:4px 0 0;padding-left:18px}
.frame .rank.rv{background:var(--panel-2);color:var(--ink);border-right:1.5px solid var(--line-strong)}
.filters{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;align-items:center}
.filters label{font-size:12px;color:var(--muted);font-family:var(--label)}
.filters input,.filters select{font:inherit;font-size:13px;padding:6px 9px;border:1px solid var(--line);background:var(--bg);color:var(--ink)}
.filters input:focus-visible,.filters select:focus-visible{outline:2px solid var(--ink);outline-offset:1px}
.empty{padding:28px;text-align:center;color:var(--muted);border:1px dashed var(--line)}
#paper{position:absolute;left:-20000px;top:0;width:1040px;background:#fff;color:#111;padding:44px 48px 40px;font-family:var(--font);font-size:13px;line-height:1.55;box-sizing:border-box}
#paper *{color:inherit}
#paper .mast{border-top:4px solid #111;border-bottom:1px solid #111;padding:14px 0 10px;display:flex;justify-content:space-between;align-items:flex-end;gap:20px}
#paper .mast h1{font-family:var(--display);font-size:38px;font-weight:600;margin:0;letter-spacing:-.01em;line-height:1.1}
#paper .mast .sub{font-size:12px;color:#555;margin-top:6px}
#paper .mast .right{text-align:right;font-size:12px;color:#333;line-height:1.7}
#paper .mast .right b{font-family:var(--display);font-size:20px;display:block;color:#111}
#paper .dateline{display:flex;justify-content:space-between;font-size:11.5px;color:#555;padding:6px 0;border-bottom:3px double #111}
#paper .kp{display:grid;grid-template-columns:repeat(5,1fr);border:1px solid #cfcfcf;margin:18px 0 0}
#paper .kp div{padding:10px 14px;border-right:1px solid #cfcfcf} #paper .kp div:last-child{border-right:0}
#paper .kp .l{font-size:11px;color:#666} #paper .kp .v{font-family:var(--display);font-size:26px;font-weight:600;line-height:1.1;margin-top:4px}
#paper .kp .v small{font-family:var(--font);font-size:12px;color:#666;font-weight:400;margin-left:2px}
#paper .kp .hi{background:#111} #paper .kp .hi .l,#paper .kp .hi .v,#paper .kp .hi small{color:#fff}
#paper h2{font-size:12.5px;font-weight:700;margin:22px 0 10px;display:flex;align-items:center;gap:10px;color:#111}
#paper h2::after{content:"";flex:1;height:1px;background:#cfcfcf}
#paper .cols{display:grid;grid-template-columns:1.15fr 1fr 1fr;gap:0}
#paper .col{padding:0 16px;border-right:1px solid #cfcfcf} #paper .col:first-child{padding-left:0} #paper .col:last-child{border-right:0;padding-right:0}
#paper .col h3{font-family:var(--display);font-size:15px;font-weight:600;margin:0 0 10px;padding-bottom:6px;border-bottom:1px solid #111}
#paper ul.p,#paper ol.p{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:7px;color:#333;font-size:12.5px;line-height:1.55}
#paper ul.p li::marker,#paper ol.p li::marker{color:#111;font-weight:600}
#paper ul.p li:first-child{color:#111;font-weight:500}
#paper table.pl{width:100%;border-collapse:collapse;font-size:12px}
#paper table.pl th{text-align:left;font-size:11px;color:#666;padding:4px 4px;border-bottom:1px solid #cfcfcf;font-weight:600}
#paper table.pl td{padding:6px 4px;border-bottom:1px solid #e3e3e3;vertical-align:top;color:#333} #paper table.pl td.d{white-space:nowrap;font-family:var(--mono);font-size:11px}
#paper .fr{border:1.5px solid #111;margin-top:14px;page-break-inside:avoid;break-inside:avoid}
#paper .fr .hd{display:grid;grid-template-columns:auto 1fr;border-bottom:1.5px solid #111}
#paper .fr .rk{background:#111;color:#fff;padding:10px 14px;min-width:68px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:11.5px}
#paper .fr .rk b{font-family:var(--display);font-size:22px;line-height:1;color:#fff}
#paper .fr .rk.rv{background:#e9e9e9;color:#111;border-right:1.5px solid #111} #paper .fr .rk.rv b{color:#111}
#paper .fr .tt{padding:9px 14px} #paper .fr .tt .nm{font-family:var(--display);font-size:17px;font-weight:600;line-height:1.35}
#paper .fr .tt .tg{font-size:11.5px;color:#444;margin-top:5px;display:flex;gap:12px;flex-wrap:wrap}
#paper .fr .tt .tg .ap{background:#111;color:#fff;padding:1px 7px}
#paper table.kv2{width:100%;border-collapse:collapse;table-layout:fixed}
#paper table.kv2 th{width:140px;text-align:left;vertical-align:top;background:#f3f3f3;font-weight:600;font-size:12px;padding:8px 12px;border-bottom:1px solid #e0e0e0;border-right:1px solid #e0e0e0}
#paper table.kv2 td{padding:8px 12px;border-bottom:1px solid #e0e0e0;font-size:12.5px;color:#333;vertical-align:top;overflow-wrap:anywhere}
#paper table.kv2 tr:last-child th,#paper table.kv2 tr:last-child td{border-bottom:0}
#paper table.kv2 tr.s th{background:#e6e6e6;font-size:11px;color:#111} #paper table.kv2 tr.s td{background:#e6e6e6;font-size:11px;color:#666}
#paper table.kv2 td.op{color:#111;font-weight:600}
#paper .ft{margin-top:26px;padding-top:10px;border-top:1px solid #111;font-size:11px;color:#666;display:flex;justify-content:space-between}
footer{margin-top:40px;padding-top:14px;border-top:1px solid var(--line);font-family:var(--label);font-size:11.5px;color:var(--muted);display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px}
@media (max-width:760px){
  .kpis{grid-template-columns:repeat(2,1fr)} .kpi:nth-child(2n){border-right:0} .kpi:nth-child(-n+4){border-bottom:1px solid var(--line)} .kpi:last-child{grid-column:1/-1}
  .sumgrid{grid-template-columns:1fr}
  .brand h1{font-size:22px}
  .frame table.kv th{width:96px}
  .seg{margin-left:0}
}
@media print{
  body{padding:0;font-size:12px} .weeks,.actions,.filters,.seg,.status,footer{display:none!important}
  .frame{break-inside:avoid;margin-bottom:12px} .tablewrap{overflow:visible} table.grid.wide{min-width:0}
}
</style>

<div class="wrap">
  <header class="top">
    <div class="brand">
      <div class="eyebrow">SpringNFlower · 총무 · 주간 지원사업 검토</div>
      <h1>지원사업 검토판</h1>
    </div>
    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
      <a class="btn sm" id="settings" href="#" target="_blank" rel="noopener" hidden>회사 조건 설정 ↗</a>
      <div class="meta" id="meta"></div>
    </div>
  </header>

  <nav class="weeks" id="weeks" role="tablist" aria-label="보고 주차"></nav>

  <div class="kpis" id="kpis"></div>

  <section>
    <h2>금주 요약</h2>
    <div class="sumgrid">
      <div class="card tint"><h3>핵심 요약</h3><ul class="pts lead" id="summary"></ul></div>
      <div class="card"><h3>종합 의견</h3><ol class="pts" id="opinion"></ol></div>
      <div class="card wide"><h3>향후 계획 <small>담당 · 기한</small></h3><table class="plan" id="plan"><thead><tr><th>할 일</th><th>담당</th><th>기한</th></tr></thead><tbody></tbody></table></div>
    </div>
    <div class="insights" id="insights" hidden></div>
    <div class="toolbar">
      <button class="btn primary" id="exp-xlsx" type="button">엑셀 내보내기 (.xlsx)</button>
      <button class="btn" id="exp-pdf" type="button">PDF로 출력</button>
      <button class="btn" id="exp-csv" type="button">CSV 내보내기</button>
      <button class="btn" id="copy" type="button">추천 목록 복사</button>
      <a class="btn" id="xlsx" href="#" download hidden>저장된 엑셀 열기</a>
      <button class="btn" id="exp-dec" type="button" hidden>신청 기록 내보내기</button>
      <span class="status" id="status" style="margin:0 0 0 auto"></span>
    </div>
    <div class="path" id="xlsxpath"></div>
  </section>

  <section>
    <h2>추천 · 검토 공고 <span id="reccount" style="color:var(--ink)"></span>
      <span class="seg" role="group" aria-label="보기 방식">
        <button type="button" id="v-frame" aria-pressed="true">분석 틀</button>
        <button type="button" id="v-table" aria-pressed="false">표</button>
      </span>
    </h2>
    <div class="frames" id="frames"></div>
    <div class="tablewrap" id="rectable" hidden>
      <table class="grid wide" id="rec">
        <thead><tr><th>No</th><th>판정</th><th>공고명 / 기관</th><th>분야</th><th>접수기간</th><th>마감</th><th>지원내용 · 규모</th><th>지원자격</th><th>신청 가능</th><th>적합도</th><th>점수</th><th>① 자격 적합성</th><th>② 기대효과</th><th>③ 리스크 · 준비부담</th><th>추진 의견</th><th>준비사항 · 서류</th><th>원문</th><th>조건 확인 · 신청</th></tr></thead>
        <tbody></tbody>
      </table>
    </div>
  </section>

  <section>
    <h2>추천 이력 <span id="histcount" style="color:var(--ink)"></span> <span style="color:var(--muted);font-weight:400">전체 주차의 추천·검토 공고</span></h2>
    <div class="tablewrap">
      <table class="grid" id="hist">
        <thead><tr><th>주차</th><th>판정</th><th>공고명 / 기관</th><th>마감</th><th>상태</th><th>점수</th><th>추진 의견</th><th>조건 확인 · 신청</th></tr></thead>
        <tbody></tbody>
      </table>
    </div>
  </section>

  <section>
    <h2>전체 검토 목록</h2>
    <div class="filters">
      <label for="q">검색</label><input id="q" type="search" placeholder="공고명 · 기관 · 사유">
      <label for="fcat">분야</label><select id="fcat"><option value="">전체</option></select>
      <label for="frec">판정</label><select id="frec"><option value="">전체</option><option>추천</option><option>검토</option><option>제외</option><option>추천 안함</option></select>
      <label for="fel">신청</label><select id="fel"><option value="">전체</option><option>가능</option><option>확인 필요</option><option>불가</option></select>
    </div>
    <div class="tablewrap">
      <table class="grid" id="all">
        <thead><tr><th>#</th><th>판정</th><th>공고명 / 기관</th><th>분야</th><th>지역</th><th>마감</th><th>신청 가능</th><th>적합도</th><th>점수</th><th>판정 사유 · 가능 여부 근거</th><th>조건 확인 · 신청</th></tr></thead>
        <tbody></tbody>
      </table>
    </div>
  </section>

  <div id="paper" aria-hidden="true"></div>
  <footer><span id="built"></span><span>출처: Subsidy Pick Guide · 매주 금요일 09:00 자동 갱신</span></footer>
</div>

<script id="data" type="application/json">${payload}</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script>
(function(){
  const DATA = JSON.parse(document.getElementById('data').textContent);
  const weeks = DATA.weeks; const profile = DATA.profile;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const isRec = (it) => it.recommend === '추천' || it.recommend === '검토';
  const fitCls = (f) => f === '상' ? 's' : f === '중' ? 'm' : 'l';
  const recCls = (r) => r === '추천' ? 'r' : r === '검토' ? '' : r === '추천 안함' ? 'na' : 'x';
  const elCls = (e) => e === '가능' ? 'ok' : e === '확인 필요' ? 'chk' : e === '불가' ? 'no' : '';
  const elHtml = (e) => e ? '<span class="el ' + elCls(e) + '"><i></i>' + esc(e) + '</span>' : '<span class="el" style="color:var(--muted)">-</span>';
  const byScore = (a, b) => (b.score || 0) - (a.score || 0);
  const fname = (w) => String(w.report_date || '').split('-').join('').slice(2) + '_지원사업검토내역';
  const local = location.protocol === 'file:';
  let cur = 0, view = 'frame';
  let decisions = {}, decCol = null, decAvail, decMode = null, openForm = null, keyIndex = {};
  const localStore = { load(){ try { return JSON.parse(localStorage.getItem('sf-decisions') || '{}'); } catch (e) { return {}; } }, save(o){ try { localStorage.setItem('sf-decisions', JSON.stringify(o)); } catch (e) {} } };
  const h32 = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(16); };
  const decKey = (it) => it.url ? 'u' + h32(String(it.url).trim().replace(/[/]+$/, '')) : 't' + h32(String(it.title || ''));
  function decUI(it, compact){
    const key = decKey(it); keyIndex[key] = it; const d = decisions[key];
    let h = '<div class="dec">';
    if (it.url) h += '<a class="btn sm" href="' + esc(it.url) + '" target="_blank" rel="noopener">조건 확인 ↗</a>';
    if (d) {
      h += d.decision === 'applied' ? '<span class="tag ap">신청함 · ' + esc(d.decided_at) + '</span>' : '<span class="tag dc">신청 안 함 · ' + esc(d.decided_at) + '</span>';
      if (d.decision === 'declined' && d.reason && !compact) h += '<span class="why">사유: ' + esc(d.reason) + '</span>';
      if (decAvail) h += '<button type="button" class="btn sm" data-dec="clear" data-key="' + key + '">취소</button>';
    } else if (decAvail) {
      if (openForm === key) h += '<form data-decform="' + key + '"><input name="reason" placeholder="신청하지 않는 이유 (예: 자부담 부담, 담당 인력 없음, 지원금 적음)" required><button type="submit" class="btn sm primary">저장</button><button type="button" class="btn sm" data-dec="closeform">닫기</button></form>';
      else h += '<button type="button" class="btn sm primary" data-dec="applied" data-key="' + key + '">신청함</button><button type="button" class="btn sm" data-dec="declined" data-key="' + key + '">신청 안 함</button>';
    }
    return h + '</div>';
  }
  async function writeDecision(key, decision, reason){
    const it = keyIndex[key]; if (!it) return;
    const w = weeks[cur];
    const doc = { url: it.url || '', title: it.title || '', agency: it.agency || '', category: it.category || '', decision, reason, decided_at: new Date().toISOString().slice(0, 10), report_date: w.report_date };
    const msg = decision === 'applied' ? '신청함으로 기록했습니다. 다음 주부터 같은 공고는 목록에서 빠집니다.' : '신청 안 함 사유를 기록했습니다. 다음 스캔부터 비슷한 공고 판정에 반영됩니다.';
    if (!decCol) { decisions[key] = doc; localStore.save(decisions); render(); status(msg + ' (이 브라우저에 저장됨 · "신청 기록 내보내기"로 data/decisions.json에 반영)'); return; }
    try { await decCol.doc(key).set(doc); decisions[key] = doc; render(); status(msg); }
    catch (err) { status('기록 실패: ' + (err && err.code ? err.code : err)); }
  }
  async function clearDecision(key){
    if (!decCol) { delete decisions[key]; localStore.save(decisions); render(); status('신청 처리 기록을 취소했습니다.'); return; }
    try { await decCol.doc(key).delete(); delete decisions[key]; render(); status('신청 처리 기록을 취소했습니다.'); }
    catch (err) { status('취소 실패: ' + (err && err.code ? err.code : err)); }
  }
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-dec]'); if (!btn) return;
    const act = btn.dataset.dec, key = btn.dataset.key;
    if (act === 'closeform') { openForm = null; render(); return; }
    if (act === 'declined') { openForm = key; render(); const f = document.querySelector('form[data-decform="' + key + '"] input'); if (f) f.focus(); return; }
    if (act === 'applied') await writeDecision(key, 'applied', '');
    if (act === 'clear') await clearDecision(key);
  });
  document.addEventListener('submit', async (e) => {
    const f = e.target.closest('form[data-decform]'); if (!f) return; e.preventDefault();
    const reason = f.reason.value.trim(); if (!reason) return;
    const key = f.dataset.decform; openForm = null; await writeDecision(key, 'declined', reason);
  });
  try { const saved = localStorage.getItem('sf-week'); const i = weeks.findIndex(w => w.report_date === saved); if (i >= 0) cur = i; view = localStorage.getItem('sf-view') === 'table' ? 'table' : 'frame'; } catch (e) {}

  $('#meta').innerHTML = '<span>' + esc(profile.company_name) + '</span><span>' + esc(profile.industry) + ' · ' + esc(profile.location) + ' ' + esc(profile.district || '') + ' · ' + esc(profile.employees) + '명 · ' + esc(profile.founded_year) + '년 설립</span>';
  $('#built').textContent = '생성 ' + DATA.built.slice(0, 16).replace('T', ' ');
  if (profile.settings_url) { $('#settings').href = profile.settings_url; $('#settings').hidden = false; }

  const nav = $('#weeks');
  weeks.forEach((w, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab'); b.id = 'wk-' + w.report_date;
    b.textContent = w.report_date; b.addEventListener('click', () => { cur = i; render(); try { localStorage.setItem('sf-week', w.report_date); } catch (e) {} });
    nav.appendChild(b);
  });

  const fitHtml = (f) => '<span class="fit ' + fitCls(f) + '"><i></i>' + esc(f || '-') + '</span>';
  const recHtml = (r) => '<span class="rec ' + recCls(r) + '">' + esc(r || '제외') + '</span>';
  const link = (u, t) => u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(t || '원문 공고 열기 ↗') + '</a>' : '-';

  function setView(v){
    view = v; try { localStorage.setItem('sf-view', v); } catch (e) {}
    $('#v-frame').setAttribute('aria-pressed', String(v === 'frame'));
    $('#v-table').setAttribute('aria-pressed', String(v === 'table'));
    $('#frames').hidden = v !== 'frame';
    $('#rectable').hidden = v !== 'table';
  }
  $('#v-frame').addEventListener('click', () => setView('frame'));
  $('#v-table').addEventListener('click', () => setView('table'));

  function render(){
    const w = weeks[cur]; if (!w) return;
    [...nav.children].forEach((b, i) => b.setAttribute('aria-selected', i === cur));
    const items = w.items || [];
    const rec = items.filter(it => it.recommend === '추천');
    const rev = items.filter(it => it.recommend === '검토');
    const exc = items.filter(it => !isRec(it));
    $('#kpis').innerHTML =
      '<div class="kpi"><div class="l">검토 공고</div><div class="v">' + items.length + '<small>건</small></div></div>' +
      '<div class="kpi hi"><div class="l">추천</div><div class="v">' + rec.length + '<small>건</small></div></div>' +
      '<div class="kpi"><div class="l">검토 대상</div><div class="v">' + rev.length + '<small>건</small></div></div>' +
      '<div class="kpi"><div class="l">제외</div><div class="v">' + exc.length + '<small>건</small></div></div>' +
      '<div class="kpi"><div class="l">신청 가능 · 확인 필요 · 불가</div><div class="v" style="font-size:22px">' + items.filter(i => i.eligible === '가능').length + ' <small>·</small> ' + items.filter(i => i.eligible === '확인 필요').length + ' <small>·</small> ' + items.filter(i => i.eligible === '불가').length + '</div></div>';
    const splitSent = (t) => String(t || '').split(/(?<=[다요]\\.)\\s+/).map(s => s.trim()).filter(Boolean);
    const splitNum = (t) => String(t || '').split(/\\s*(?=\\d+\\)\\s)/).map(s => s.replace(/^\\d+\\)\\s*/, '').trim()).filter(Boolean);
    const pts = (arr, fb, sp) => (Array.isArray(arr) && arr.length) ? arr : sp(fb);
    const li = (arr) => arr.map(s => '<li>' + esc(s) + '</li>').join('') || '<li style="color:var(--muted)">-</li>';
    $('#summary').innerHTML = li(pts(w.summary_points, w.summary, splitSent));
    $('#opinion').innerHTML = li(pts(w.opinion_points, w.conclusion, splitNum));
    const steps = Array.isArray(w.next_steps) ? w.next_steps : [];
    $('#plan tbody').innerHTML = steps.length ? steps.map(s => { const o = typeof s === 'string' ? { task: s } : s; return '<tr><td class="t">' + esc(o.task || '') + '</td><td class="o">' + esc(o.owner || '-') + '</td><td class="d">' + esc(o.due || '-') + '</td></tr>'; }).join('') : '<tr><td colspan="3" style="color:var(--muted)">종합 의견 참고</td></tr>';
    const ins = w.decline_insights || []; const skipped = w.skipped_applied || 0;
    $('#insights').hidden = !(ins.length || skipped);
    $('#insights').innerHTML = (skipped ? '<h4>기신청 제외</h4><div>이미 신청한 공고 ' + skipped + '건은 목록에서 뺐습니다.</div>' : '') + (ins.length ? '<h4 style="margin-top:' + (skipped ? '8px' : '0') + '">미신청 사유 분석 → 추천 안함 기준</h4><ul>' + ins.map(s => '<li>' + esc(s) + '</li>').join('') + '</ul>' : '');
    $('#xlsx').hidden = !local;
    $('#xlsx').setAttribute('href', encodeURI(w.xlsx));
    $('#xlsxpath').textContent = (local ? '자동 생성본: ' : '자동 생성본 위치: ') + '지원사업\\\\reports\\\\' + w.xlsx;

    const sorted = items.filter(isRec).sort(byScore);
    $('#reccount').textContent = sorted.length ? '· ' + sorted.length + '건' : '';

    // 분석 틀
    const fr = $('#frames'); fr.innerHTML = '';
    if (!sorted.length) fr.innerHTML = '<div class="empty">금주 추천·검토 대상 공고가 없습니다.</div>';
    sorted.forEach((it, i) => {
      const a = it.analysis || {};
      const el = document.createElement('article'); el.className = 'frame';
      el.innerHTML =
        '<div class="head"><div class="rank' + (it.recommend === '검토' ? ' rv' : '') + '"><b>' + (i + 1) + '</b><span>' + esc(it.recommend) + '</span></div>' +
        '<div class="ttl"><div class="name">' + esc(it.title) + '</div>' +
        '<div class="tags"><span>' + esc(it.agency || '') + '</span><span>' + esc(it.category || '') + '</span><span>' + esc(it.region || '') + '</span><span>마감 ' + esc(it.deadline || '-') + '</span>' + fitHtml(it.fit) + '<span>' + esc(it.score ?? '-') + '점</span>' + elHtml(it.eligible) + '</div></div></div>' +
        '<table class="kv"><tbody>' +
        '<tr class="sec"><th>공고 개요</th><td>접수기간 ' + esc(it.period || it.deadline || '-') + '</td></tr>' +
        '<tr><th>지원내용 · 규모</th><td>' + esc(it.support || '-') + '</td></tr>' +
        '<tr><th>지원자격 (핵심 요건)</th><td>' + esc(it.eligibility || '-') + '</td></tr>' +
        '<tr><th>신청 가능 여부</th><td>' + elHtml(it.eligible) + (it.eligible_reason ? ' <span style="color:var(--ink-2)">— ' + esc(it.eligible_reason) + '</span>' : '') + '</td></tr>' +
        '<tr class="sec"><th>타당성 분석</th><td>자격 적합성 40 · 기대효과 35 · 실행 용이성 25 = ' + esc(it.score ?? '-') + '점</td></tr>' +
        '<tr><th>① 자격 적합성</th><td>' + esc(a.eligibility || '-') + '</td></tr>' +
        '<tr><th>② 기대효과</th><td>' + esc(a.benefit || '-') + '</td></tr>' +
        '<tr><th>③ 리스크 · 준비부담</th><td>' + esc(a.risk || '-') + '</td></tr>' +
        '<tr class="sec"><th>추진 계획</th><td></td></tr>' +
        '<tr><th>추진 의견</th><td class="op">' + esc(it.opinion || '-') + '</td></tr>' +
        '<tr><th>필요 준비사항 · 서류</th><td>' + esc(it.preparation || '-') + '</td></tr>' +
        '<tr><th>원문 링크</th><td>' + link(it.url) + '</td></tr>' +
        '<tr><th>신청 처리</th><td>' + decUI(it) + '</td></tr>' +
        '</tbody></table>';
      fr.appendChild(el);
    });

    // 표
    const tb = $('#rec tbody'); tb.innerHTML = '';
    if (!sorted.length) tb.innerHTML = '<tr><td colspan="18"><div class="empty">금주 추천·검토 대상 공고가 없습니다.</div></td></tr>';
    sorted.forEach((it, i) => {
      const a = it.analysis || {};
      const tr = document.createElement('tr');
      tr.innerHTML = '<td class="num">' + (i + 1) + '</td><td>' + recHtml(it.recommend) + '</td>' +
        '<td class="title">' + esc(it.title) + '<div class="sub">' + esc(it.agency || '') + '</div></td>' +
        '<td>' + esc(it.category || '') + '</td><td class="num">' + esc(it.period || '-') + '</td><td class="num">' + esc(it.deadline || '-') + '</td>' +
        '<td class="long">' + esc(it.support || '') + '</td><td class="long">' + esc(it.eligibility || '') + '</td>' +
        '<td>' + elHtml(it.eligible) + (it.eligible_reason ? '<div class="sub" style="font-size:11.5px;color:var(--muted);white-space:normal;min-width:160px">' + esc(it.eligible_reason) + '</div>' : '') + '</td>' +
        '<td>' + fitHtml(it.fit) + '</td><td class="num">' + esc(it.score ?? '-') + '</td>' +
        '<td class="long">' + esc(a.eligibility || '') + '</td><td class="long">' + esc(a.benefit || '') + '</td><td class="long">' + esc(a.risk || '') + '</td>' +
        '<td class="long" style="color:var(--ink);font-weight:600">' + esc(it.opinion || '') + '</td><td class="long">' + esc(it.preparation || '') + '</td><td>' + link(it.url, '열기 ↗') + '</td><td class="decc">' + decUI(it, true) + '</td>';
      tb.appendChild(tr);
    });

    const cats = [...new Set(items.map(it => it.category).filter(Boolean))];
    const sel = $('#fcat'); const keep = sel.value; sel.innerHTML = '<option value="">전체</option>' + cats.map(c => '<option' + (c === keep ? ' selected' : '') + '>' + esc(c) + '</option>').join('');
    renderAll();
    renderHist();
    setView(view);
  }

  function deadlineState(d){
    const m = String(d || '').match(/(\\d{4})[.-](\\d{2})[.-](\\d{2})/);
    if (!m) return { cls: 'open', label: /상시/.test(d || '') ? '상시' : '확인' };
    const dt = new Date(+m[1], +m[2] - 1, +m[3]); const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.round((dt - today) / 86400000);
    if (diff < 0) return { cls: 'closed', label: '마감' };
    return { cls: 'open', label: diff === 0 ? 'D-DAY' : 'D-' + diff };
  }
  function renderHist(){
    const seen = new Map();
    weeks.forEach((w) => { (w.items || []).filter(isRec).forEach(it => { const k = decKey(it); if (!seen.has(k)) seen.set(k, { it, week: w.report_date, first: w.report_date, n: 1 }); else { const e = seen.get(k); e.first = w.report_date; e.n++; } }); });
    const rows = [...seen.values()].sort((a, b) => a.week === b.week ? (b.it.score || 0) - (a.it.score || 0) : (a.week < b.week ? 1 : -1));
    $('#histcount').textContent = rows.length ? '· ' + rows.length + '건' : '';
    const tb = $('#hist tbody'); tb.innerHTML = '';
    if (!rows.length) { tb.innerHTML = '<tr><td colspan="8"><div class="empty">아직 추천 이력이 없습니다.</div></td></tr>'; return; }
    rows.forEach(({ it, week, first, n }) => {
      const st = deadlineState(it.deadline);
      const tr = document.createElement('tr');
      tr.innerHTML = '<td class="hist-week">' + esc(week) + (n > 1 ? '<div class="sub" style="font-size:11px;color:var(--muted)">' + n + '주 연속 · 최초 ' + esc(first) + '</div>' : '') + '</td><td>' + recHtml(it.recommend) + '</td>' +
        '<td class="title">' + esc(it.title) + '<div class="sub">' + esc(it.agency || '') + '</div></td><td class="num">' + esc(it.deadline || '-') + '</td>' +
        '<td><span class="st ' + st.cls + '">' + st.label + '</span></td><td class="num">' + esc(it.score ?? '-') + '</td><td class="long">' + esc(it.opinion || '') + '</td><td class="decc">' + decUI(it, true) + '</td>';
      tb.appendChild(tr);
    });
  }

  function renderAll(){
    const w = weeks[cur]; const items = (w.items || []).slice().sort(byScore);
    const q = $('#q').value.trim().toLowerCase(); const fc = $('#fcat').value; const fr = $('#frec').value; const fe = $('#fel').value;
    const tb = $('#all tbody'); tb.innerHTML = '';
    let n = 0;
    items.forEach((it) => {
      if (fc && it.category !== fc) return;
      if (fr && (it.recommend || '제외') !== fr) return;
      if (fe && (it.eligible || '') !== fe) return;
      const hay = [it.title, it.agency, it.reason, it.opinion, it.eligible_reason].join(' ').toLowerCase();
      if (q && !hay.includes(q)) return;
      n++;
      const tr = document.createElement('tr');
      tr.innerHTML = '<td class="num">' + n + '</td><td>' + recHtml(it.recommend) + '</td>' +
        '<td class="title">' + (it.url ? '<a href="' + esc(it.url) + '" target="_blank" rel="noopener" style="text-decoration:none">' + esc(it.title) + '</a>' : esc(it.title)) + '<div class="sub">' + esc(it.agency || '') + '</div></td>' +
        '<td>' + esc(it.category || '') + '</td><td>' + esc(it.region || '') + '</td><td class="num">' + esc(it.deadline || '-') + '</td>' +
        '<td>' + elHtml(it.eligible) + '</td><td>' + fitHtml(it.fit) + '</td><td class="num">' + esc(it.score ?? '-') + '</td><td style="color:var(--ink-2)">' + esc(it.reason || it.opinion || '') + (it.eligible_reason ? '<div class="sub" style="font-size:11.5px;color:var(--muted);margin-top:3px">자격: ' + esc(it.eligible_reason) + '</div>' : '') + '</td><td class="decc">' + decUI(it, true) + '</td>';
      tb.appendChild(tr);
    });
    if (!n) tb.innerHTML = '<tr><td colspan="11"><div class="empty">조건에 맞는 공고가 없습니다.</div></td></tr>';
  }
  ['#q', '#fcat', '#frec', '#fel'].forEach(s => $(s).addEventListener('input', renderAll));

  // ───────── 내보내기 ─────────
  const status = (t) => { $('#status').textContent = t || ''; };
  async function saveFile(filename, blob){
    if (window.claude && typeof window.claude.use === 'function') {
      const dl = await window.claude.use('downloads');
      if (dl) {
        try { await dl.save({ filename, data: blob }); return '저장됨: ' + filename; }
        catch (e) {
          if (e && e.code === 'declined') return '저장을 취소했습니다.';
          if (e && e.code === 'rate_limited') return '저장 확인 창이 이미 열려 있습니다. 잠시 후 다시 시도하세요.';
          return '이 화면에서는 파일 저장이 제한됩니다. 로컬 폴더의 reports/index.html에서 내보내세요.';
        }
      }
      if (!local) return '이 화면에서는 파일 저장이 제한됩니다. 로컬 폴더의 reports/index.html에서 내보내세요.';
    }
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
    return '다운로드 시작: ' + filename;
  }

  function rowsRec(w){
    return (w.items || []).filter(isRec).sort(byScore).map((it, i) => { const a = it.analysis || {}; return [i + 1, it.recommend || '', it.category || '', it.title || '', it.agency || '', it.period || '', it.deadline || '', it.support || '', it.eligibility || '', it.eligible || '', it.eligible_reason || '', it.fit || '', it.score ?? '', a.eligibility || '', a.benefit || '', a.risk || '', it.opinion || '', it.preparation || '', it.url || '']; });
  }
  const HEAD_REC = ['No', '판정', '분야', '공고명', '주관기관', '접수기간', '마감일', '지원내용 / 지원규모', '지원자격 (핵심 요건)', '신청 가능', '가능 여부 근거', '적합도', '타당성 점수', '① 자격 적합성', '② 기대효과', '③ 리스크·준비부담', '추진 의견', '필요 준비사항 / 서류', '원문 링크'];
  function rowsAll(w){
    const items = (w.items || []).slice().sort(byScore);
    return items.map((it, i) => [i + 1, it.category || '', it.title || '', it.agency || '', it.region || '', it.deadline || '', it.eligible || '', it.eligible_reason || '', it.recommend || '제외', it.fit || '', it.score ?? '', it.reason || it.opinion || '', it.url || '']);
  }
  const HEAD_ALL = ['No', '분야', '공고명', '주관기관', '지역', '마감일', '신청 가능', '가능 여부 근거', '판정', '적합도', '점수', '판정 사유', '원문 링크'];

  function buildPaper(w){
    const items = w.items || [];
    const recs = items.filter(isRec).sort(byScore).filter(it => { const d = decisions[decKey(it)]; return !(d && d.decision === 'declined'); });
    const cnt = (f) => items.filter(f).length;
    const splitSent = (t) => String(t || '').split('. ').map(s => s.trim()).filter(Boolean);
    const sp = (arr, fb) => (Array.isArray(arr) && arr.length) ? arr : splitSent(fb);
    const li = (arr) => arr.map(s => '<li>' + esc(s) + '</li>').join('');
    const steps = Array.isArray(w.next_steps) ? w.next_steps : [];
    const idx = weeks.length - weeks.indexOf(w);
    let h = '<div class="mast"><div><h1>지원사업 주간 검토</h1><div class="sub">' + esc(profile.company_name) + ' · ' + esc(profile.industry) + ' · ' + esc(profile.location) + ' ' + esc(profile.district || '') + ' · ' + esc(profile.employees) + '명 · ' + esc(profile.founded_year) + '년 설립</div></div>' +
      '<div class="right"><b>' + esc(w.report_date) + '</b>제' + idx + '호 · ' + esc(profile.department || '') + '</div></div>' +
      '<div class="dateline"><span>검토기간 ' + esc(w.period || '') + '</span><span>출처 ' + esc(w.source || '') + '</span></div>' +
      '<div class="kp"><div><div class="l">검토 공고</div><div class="v">' + items.length + '<small>건</small></div></div><div class="hi"><div class="l">추천</div><div class="v">' + cnt(i => i.recommend === '추천') + '<small>건</small></div></div><div><div class="l">검토 대상</div><div class="v">' + cnt(i => i.recommend === '검토') + '<small>건</small></div></div><div><div class="l">제외</div><div class="v">' + cnt(i => !isRec(i)) + '<small>건</small></div></div><div><div class="l">신청 가능 · 확인 필요 · 불가</div><div class="v" style="font-size:19px">' + cnt(i => i.eligible === '가능') + ' <small>·</small> ' + cnt(i => i.eligible === '확인 필요') + ' <small>·</small> ' + cnt(i => i.eligible === '불가') + '</div></div></div>' +
      '<h2>금주 요약</h2><div class="cols">' +
      '<div class="col"><h3>핵심 요약</h3><ul class="p">' + li(sp(w.summary_points, w.summary)) + '</ul></div>' +
      '<div class="col"><h3>종합 의견</h3><ol class="p">' + li(sp(w.opinion_points, w.conclusion)) + '</ol></div>' +
      '<div class="col"><h3>향후 계획</h3><table class="pl"><thead><tr><th>할 일</th><th>담당</th><th>기한</th></tr></thead><tbody>' + (steps.length ? steps.map(s => { const o = typeof s === 'string' ? { task: s } : s; return '<tr><td>' + esc(o.task || '') + '</td><td>' + esc(o.owner || '-') + '</td><td class="d">' + esc(o.due || '-') + '</td></tr>'; }).join('') : '<tr><td colspan="3">-</td></tr>') + '</tbody></table></div></div>' +
      '<h2>추천 · 검토 공고 ' + recs.length + '건' + (items.filter(isRec).length !== recs.length ? ' <span style="font-weight:400;color:#666">(신청 안 함 ' + (items.filter(isRec).length - recs.length) + '건 제외)</span>' : '') + '</h2>';
    if (!recs.length) h += '<div style="padding:20px;border:1px dashed #cfcfcf;color:#666;text-align:center">금주 추천·검토 대상 공고가 없습니다.</div>';
    recs.forEach((it, i) => {
      const a = it.analysis || {}; const d = decisions[decKey(it)];
      h += '<article class="fr"><div class="hd"><div class="rk' + (it.recommend === '검토' ? ' rv' : '') + '"><b>' + (i + 1) + '</b><span>' + esc(it.recommend) + '</span></div><div class="tt"><div class="nm">' + esc(it.title) + '</div><div class="tg"><span>' + esc(it.agency || '') + '</span><span>' + esc(it.category || '') + '</span><span>' + esc(it.region || '') + '</span><span>마감 ' + esc(it.deadline || '-') + '</span><span>적합도 ' + esc(it.fit || '-') + ' · ' + esc(it.score ?? '-') + '점</span><span>신청 ' + esc(it.eligible || '-') + '</span>' + (d && d.decision === 'applied' ? '<span class="ap">신청함 ' + esc(d.decided_at) + '</span>' : '') + '</div></div></div>' +
        '<table class="kv2"><tbody>' +
        '<tr class="s"><th>공고 개요</th><td>접수기간 ' + esc(it.period || it.deadline || '-') + '</td></tr>' +
        '<tr><th>지원내용 · 규모</th><td>' + esc(it.support || '-') + '</td></tr>' +
        '<tr><th>지원자격</th><td>' + esc(it.eligibility || '-') + (it.eligible_reason ? ' <span style="color:#666">— ' + esc(it.eligible_reason) + '</span>' : '') + '</td></tr>' +
        '<tr class="s"><th>타당성 분석</th><td>자격 적합성 40 · 기대효과 35 · 실행 용이성 25 = ' + esc(it.score ?? '-') + '점</td></tr>' +
        '<tr><th>① 자격 적합성</th><td>' + esc(a.eligibility || '-') + '</td></tr>' +
        '<tr><th>② 기대효과</th><td>' + esc(a.benefit || '-') + '</td></tr>' +
        '<tr><th>③ 리스크 · 준비부담</th><td>' + esc(a.risk || '-') + '</td></tr>' +
        '<tr class="s"><th>추진 계획</th><td></td></tr>' +
        '<tr><th>추진 의견</th><td class="op">' + esc(it.opinion || '-') + '</td></tr>' +
        '<tr><th>필요 준비사항</th><td>' + esc(it.preparation || '-') + '</td></tr>' +
        '<tr><th>원문</th><td style="font-family:var(--mono);font-size:11px;color:#555">' + esc(it.url || '-') + '</td></tr>' +
        '</tbody></table></article>';
    });
    h += '<div class="ft"><span>' + esc(profile.company_name) + ' · ' + esc(profile.department || '') + ' 주간 지원사업 검토</span><span>생성 ' + new Date().toISOString().slice(0, 10) + ' · Subsidy Pick Guide 기반 자동 스캔</span></div>';
    return h;
  }
  $('#exp-pdf').addEventListener('click', async () => {
    const w = weeks[cur]; const btn = $('#exp-pdf');
    if (typeof html2canvas === 'undefined' || !window.jspdf) { status('PDF 라이브러리를 불러오지 못했습니다. 잠시 후 다시 시도하세요.'); return; }
    btn.disabled = true; status('PDF 생성 중… (수 초 소요)');
    const paper = $('#paper');
    try {
      paper.innerHTML = buildPaper(w);
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const canvas = await html2canvas(paper, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false, windowWidth: 1040 });
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pw = 210, ph = 297, m = 8; const iw = pw - m * 2; const ratio = iw / canvas.width; const pageHpx = Math.floor((ph - m * 2) / ratio);
      let y = 0, page = 0;
      while (y < canvas.height) {
        const sliceH = Math.min(pageHpx, canvas.height - y);
        const c = document.createElement('canvas'); c.width = canvas.width; c.height = sliceH;
        c.getContext('2d').drawImage(canvas, 0, y, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
        if (page > 0) pdf.addPage();
        pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', m, m, iw, sliceH * ratio);
        pdf.setFontSize(8); pdf.setTextColor(120); pdf.text(String(page + 1), pw / 2, ph - 4, { align: 'center' });
        y += sliceH; page++;
      }
      const blob = pdf.output('blob');
      status(await saveFile(fname(w) + '.pdf', blob));
    } catch (e) { status('PDF 생성 실패: ' + (e && e.message ? e.message : e)); }
    finally { paper.innerHTML = ''; btn.disabled = false; }
  });

  $('#exp-dec').addEventListener('click', async () => {
    const docs = Object.entries(decisions).map(([id, d]) => ({ id, ...d }));
    status(await saveFile('decisions.json', new Blob([JSON.stringify({ decisions: docs, exported_at: new Date().toISOString() }, null, 2)], { type: 'application/json' })));
  });
  $('#exp-csv').addEventListener('click', async () => {
    const w = weeks[cur]; const q = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const lines = [HEAD_REC.map(q).join(','), ...rowsRec(w).map(r => r.map(q).join(',')), '', HEAD_ALL.map(q).join(','), ...rowsAll(w).map(r => r.map(q).join(','))];
    const blob = new Blob(['\\ufeff' + lines.join('\\r\\n')], { type: 'text/csv' });
    status(await saveFile(fname(w) + '.csv', blob));
  });

  $('#exp-xlsx').addEventListener('click', async () => {
    const w = weeks[cur]; const btn = $('#exp-xlsx');
    if (typeof ExcelJS === 'undefined') { status('엑셀 라이브러리를 불러오지 못했습니다. CSV로 내보내세요.'); return; }
    btn.disabled = true; status('엑셀 생성 중…');
    try {
      const wb = new ExcelJS.Workbook(); wb.creator = profile.reporter || 'SF Grant Scout';
      const HF = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
      const HFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      const thin = { style: 'thin', color: { argb: 'FFBFBFBF' } }; const B = { top: thin, left: thin, bottom: thin, right: thin };
      const WRAP = { vertical: 'top', wrapText: true }; const C = { vertical: 'middle', horizontal: 'center', wrapText: true };
      const fitFill = (f) => f === '상' ? 'FFC6EFCE' : f === '중' ? 'FFFFEB9C' : f === '하' ? 'FFFFC7CE' : null;
      const eligFill = (e) => e === '가능' ? 'FFC6EFCE' : e === '확인 필요' ? 'FFFFEB9C' : e === '불가' ? 'FFFFC7CE' : null;
      const hdr = (row) => { row.eachCell(c => { c.fill = HF; c.font = HFont; c.alignment = C; c.border = B; }); row.height = 28; };
      const body = (row) => row.eachCell({ includeEmpty: true }, c => { c.alignment = WRAP; c.border = B; c.font = { size: 10 }; });
      const won = (v) => typeof v === 'number' ? (v / 1e8).toFixed(1) + '억원' : '-';
      const recs = (w.items || []).filter(isRec).sort(byScore);

      // 1. 요약
      const s = wb.addWorksheet('검토보고 요약'); s.columns = [{ width: 22 }, { width: 60 }, { width: 22 }, { width: 30 }];
      s.mergeCells('A1:D1'); s.getCell('A1').value = '정부·지자체 지원사업 주간 검토 보고'; s.getCell('A1').font = { bold: true, size: 16 }; s.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' }; s.getRow(1).height = 36;
      const cnt = (e) => (w.items || []).filter(i => i.eligible === e).length;
      const meta = [['보고일자', w.report_date, '작성부서 / 작성자', (profile.department || '') + ' / ' + (profile.reporter || '')], ['검토기간', w.period || '', '출처', w.source || ''], ['검토 공고 수', (w.items || []).length + '건', '추천/검토 대상', recs.length + '건'], ['신청 가능 여부', '가능 ' + cnt('가능') + '건 · 확인 필요 ' + cnt('확인 필요') + '건 · 불가 ' + cnt('불가') + '건', '', '']];
      meta.forEach((r, i) => { const row = s.getRow(3 + i); if (i === 3) s.mergeCells('B' + (3 + i) + ':D' + (3 + i)); row.values = r; [1, 3].forEach(c => { row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; row.getCell(c).font = { bold: true, size: 10 }; }); body(row); });
      let r = 8; s.getCell('A' + r).value = '1. 회사 기본 정보 (적합성 판단 기준)'; s.getCell('A' + r).font = { bold: true, size: 12 }; r++;
      const fin = profile.finance || {};
      const prof = [['회사명', profile.company_name, '업종', profile.industry], ['소재지', profile.location + ' ' + (profile.district || ''), '설립연도 / 업력', profile.founded_year + '년 / ' + profile.business_age_years + '년차'], ['직원 수', profile.employees + '명 내외', '기업 규모', profile.size_class]];
      if (fin.fiscal_year) { prof.push(['매출액 (FY' + fin.fiscal_year + ')', won(fin.revenue_krw), '영업이익 / 당기순이익', won(fin.operating_income_krw) + ' / ' + won(fin.net_income_krw)]); prof.push(['자산 / 부채 / 자본', won(fin.total_assets_krw) + ' / ' + won(fin.total_liabilities_krw) + ' / ' + won(fin.total_equity_krw), '부채비율', fin.debt_ratio_pct + '%']); }
      prof.push(['관심 분야', (profile.interests || []).join('\\n'), '', '']);
      prof.forEach(v => { const row = s.getRow(r++); row.values = v; [1, 3].forEach(c => { row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } }; row.getCell(c).font = { bold: true, size: 10 }; }); body(row); });
      s.mergeCells('B' + (r - 1) + ':D' + (r - 1)); s.getRow(r - 1).height = 48; r++;
      s.getCell('A' + r).value = '2. 금주 핵심 요약'; s.getCell('A' + r).font = { bold: true, size: 12 }; r++;
      s.mergeCells('A' + r + ':D' + r); s.getCell('A' + r).value = w.summary || ''; s.getCell('A' + r).alignment = WRAP; s.getCell('A' + r).border = B; s.getRow(r).height = Math.max(60, Math.ceil((w.summary || '').length / 60) * 18); r += 2;
      s.getCell('A' + r).value = '3. 추천 공고 목록 (우선순위순)'; s.getCell('A' + r).font = { bold: true, size: 12 }; r++;
      const h = s.getRow(r++); h.values = ['우선순위 / 적합도', '공고명', '마감일', '추진 의견']; hdr(h);
      recs.forEach((it, i) => { const row = s.getRow(r++); row.values = [(i + 1) + '순위 / ' + (it.fit || '-') + ' (' + (it.score ?? '-') + '점)', it.title, it.deadline || '-', it.opinion || '']; body(row); const f = fitFill(it.fit); if (f) row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: f } }; });
      r++; s.getCell('A' + r).value = '4. 종합 의견 및 향후 계획'; s.getCell('A' + r).font = { bold: true, size: 12 }; r++;
      s.mergeCells('A' + r + ':D' + r); s.getCell('A' + r).value = w.conclusion || ''; s.getCell('A' + r).alignment = WRAP; s.getCell('A' + r).border = B; s.getRow(r).height = Math.max(60, Math.ceil((w.conclusion || '').length / 60) * 18);
      s.pageSetup = { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

      // 2. 타당성 분석
      const t = wb.addWorksheet('추천공고 타당성분석');
      t.columns = [5, 8, 11, 38, 16, 16, 11, 30, 30, 9, 26, 8, 9, 30, 30, 30, 28, 28, 30].map((width, i) => ({ header: HEAD_REC[i], width }));
      hdr(t.getRow(1)); t.views = [{ state: 'frozen', ySplit: 1 }];
      rowsRec(w).forEach(vals => { const row = t.addRow(vals); body(row); [1, 2, 10, 12, 13].forEach(c => row.getCell(c).alignment = C); const f = fitFill(vals[11]); if (f) row.getCell(12).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: f } }; const ef = eligFill(vals[9]); if (ef) row.getCell(10).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ef } }; if (vals[18]) { row.getCell(19).value = { text: vals[18], hyperlink: vals[18] }; row.getCell(19).font = { color: { argb: 'FF0563C1' }, underline: true, size: 10 }; } row.height = 120; });
      t.autoFilter = { from: 'A1', to: 'S1' }; t.pageSetup = { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

      // 3. 전체 목록
      const u = wb.addWorksheet('전체 검토목록');
      u.columns = [5, 11, 45, 18, 10, 11, 9, 34, 8, 8, 7, 50, 30].map((width, i) => ({ header: HEAD_ALL[i], width }));
      hdr(u.getRow(1)); u.views = [{ state: 'frozen', ySplit: 1 }];
      rowsAll(w).forEach(vals => { const row = u.addRow(vals); body(row); [1, 7, 9, 10, 11].forEach(c => row.getCell(c).alignment = C); const f = fitFill(vals[9]); if (f) row.getCell(10).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: f } }; const ef = eligFill(vals[6]); if (ef) row.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ef } }; if (vals[8] === '추천') row.getCell(9).font = { bold: true, color: { argb: 'FF006100' }, size: 10 }; if (vals[12]) { row.getCell(13).value = { text: vals[12], hyperlink: vals[12] }; row.getCell(13).font = { color: { argb: 'FF0563C1' }, underline: true, size: 10 }; } });
      u.autoFilter = { from: 'A1', to: 'M1' }; u.pageSetup = { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

      const buf = await wb.xlsx.writeBuffer();
      status(await saveFile(fname(w) + '.xlsx', new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })));
    } catch (e) { status('엑셀 생성 실패: ' + (e && e.message ? e.message : e)); }
    finally { btn.disabled = false; }
  });

  $('#copy').addEventListener('click', async () => {
    const w = weeks[cur]; const rows = (w.items || []).filter(isRec).sort(byScore)
      .map((it, i) => (i + 1) + '. [' + it.recommend + '/' + it.fit + ' ' + it.score + '점] ' + it.title + ' — ' + (it.agency || '') + ' · 마감 ' + (it.deadline || '-') + '\\n   ' + (it.opinion || ''));
    const text = '[' + w.report_date + ' 지원사업 검토 요약]\\n' + rows.join('\\n');
    try { await navigator.clipboard.writeText(text); status('추천 목록을 클립보드에 복사했습니다.'); } catch (e) { window.prompt('아래 내용을 복사하세요', text); }
  });

  if (!weeks.length) { document.querySelector('.wrap').insertAdjacentHTML('beforeend', '<div class="empty">아직 생성된 주간 보고가 없습니다.</div>'); }
  render();
  const useLocal = () => { decMode = 'local'; decisions = localStore.load(); decAvail = true; $('#exp-dec').hidden = false; render(); };
  (async () => {
    if (!(window.claude && typeof window.claude.use === 'function')) { useLocal(); return; }
    const db = await window.claude.use('db');
    if (!db) { useLocal(); return; }
    decCol = db.collection('decisions'); decAvail = true; decMode = 'db';
    decCol.limit(1000).onSnapshot((snap) => { const next = {}; snap.docs.forEach(d => { next[d.id] = d.data(); }); decisions = next; render(); }, () => { decAvail = false; render(); });
  })();
})();
</script>
`;

fs.mkdirSync(path.join(ROOT, "reports"), { recursive: true });
const out = path.join(ROOT, "reports", "index.html");
fs.writeFileSync(out, html, "utf8");
console.log("생성 완료:", out, `(${weeks.length}주차)`);
