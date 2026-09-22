// 공고 사이트 어댑터: 목록 페이지와 상세 페이지를 가져와 구조화한다.
// 다른 사이트에 붙이려면 config/site.json 의 URL 템플릿과 선택자만 바꾸면 된다 (서버 렌더링 HTML 기준).
const { parse } = require("node-html-parser");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function textNodes(el) {
  const out = [];
  const walk = (n) => {
    if (n.nodeType === 3) { const t = n.rawText.replace(/\s+/g, " ").trim(); if (t) out.push(t); }
    else if (n.childNodes) n.childNodes.forEach(walk);
  };
  walk(el);
  return out;
}

async function getHtml(url, delay) {
  const res = await fetch(url, { headers: { "user-agent": "grant-scout/0.1 (+https://github.com)" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  if (delay) await sleep(delay);
  return res.text();
}

/** 목록 페이지 한 장을 파싱해 카드 배열을 돌려준다. */
function parseList(html, site) {
  const root = parse(html);
  const cards = [];
  for (const c of root.querySelectorAll(site.selectors.card)) {
    const dl = c.querySelector(site.selectors.detail_link);
    if (!dl) continue;
    const id = dl.getAttribute("href").split("/").pop();
    const ol = c.querySelector(site.selectors.origin_link);
    const parts = textNodes(c).filter((s) => !/^(원문공고|상세보기|관심공고 담기|공공|민간|NEW)$/.test(s));
    const isNew = textNodes(c).includes("NEW");
    // 순서: 공고명 | 분야 | 지역 | 기관 | 접수상태 | 접수기간 | D-day
    const [title, category, region, agency, status, period, dday] = parts;
    cards.push({ id, title, category, region, agency, status, period, dday, is_new: isNew, url: ol ? ol.getAttribute("href") : "", raw: parts.join(" | ") });
  }
  return cards;
}

/** 설정된 분야·검색어 조합의 목록을 모두 수집한다 (id 기준 중복 제거). */
async function collectListings(site, log = console.log) {
  const seen = new Map();
  const jobs = [];
  for (const c of site.categories) for (let p = 1; p <= c.pages; p++) jobs.push({ q: "", cat: c.cat, page: p });
  for (const k of site.keywords) for (let p = 1; p <= k.pages; p++) jobs.push({ q: k.q, cat: "", page: p });
  for (const j of jobs) {
    const url = site.base_url + site.list_url.replace("{q}", encodeURIComponent(j.q)).replace("{cat}", encodeURIComponent(j.cat)).replace("{page}", j.page);
    try {
      const cards = parseList(await getHtml(url, site.request_delay_ms), site);
      cards.forEach((c) => { if (!seen.has(c.id)) seen.set(c.id, { ...c, found_by: j.cat || `q:${j.q}` }); });
      log(`목록 ${j.cat || "q:" + j.q} p${j.page}: ${cards.length}건 (누적 ${seen.size})`);
    } catch (e) { log(`목록 실패 ${url}: ${e.message}`); }
  }
  return [...seen.values()];
}

/** 상세 페이지에서 메타(접수상태·기간·지원지역·대상·기관)와 본문 발췌를 뽑는다. */
function parseDetail(html, site) {
  const root = parse(html);
  const main = root.querySelector(site.selectors.detail_main) || root;
  const parts = textNodes(main);
  const txt = parts.join(" | ");
  const i = txt.indexOf(site.selectors.detail_body_marker);
  const head = (i > 0 ? txt.slice(0, i) : txt.slice(0, 1200));
  const body = i > 0 ? txt.slice(i + site.selectors.detail_body_marker.length, i + site.selectors.detail_body_marker.length + 1800) : "";
  const pick = (label) => { const k = parts.indexOf(label); return k >= 0 && parts[k + 1] ? parts[k + 1] : ""; };
  return {
    status: pick("접수 상태"), period: pick("접수 기간"), posted: pick("게시일"), region: pick("지원 지역"), target: pick("지원 대상"),
    agency: pick("소관 기관"), operator: pick("수행 기관"), attachments: parts.filter((s) => /\.(pdf|hwp|hwpx|zip|xlsx?|docx?)$/i.test(s)),
    body_excerpt: body.replace(/\s*\|\s*/g, " ").trim(), head_excerpt: head.slice(0, 400),
  };
}

async function fetchDetails(site, cards, log = console.log) {
  const out = [];
  let idx = 0;
  const worker = async () => {
    while (idx < cards.length) {
      const c = cards[idx++];
      const url = site.base_url + site.detail_url.replace("{id}", c.id);
      try { out.push({ ...c, detail: parseDetail(await getHtml(url, site.request_delay_ms), site) }); }
      catch (e) { log(`상세 실패 ${c.id}: ${e.message}`); out.push({ ...c, detail: null }); }
    }
  };
  await Promise.all(Array.from({ length: site.detail_concurrency || 3 }, worker));
  return out;
}

module.exports = { collectListings, fetchDetails, parseList, parseDetail };
