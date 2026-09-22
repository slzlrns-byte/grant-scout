# grant-scout

정부·지자체 지원사업 공고를 **매주 자동으로 수집 → 회사 조건과 대조 → Claude로 타당성 분석 → 엑셀 보고서와 대시보드 생성**하는 파이프라인입니다.
총무·경영지원 담당자가 "이번 주에 우리 회사가 신청할 만한 사업이 뭐가 있나"를 금요일 아침에 바로 보고할 수 있게 만드는 것이 목표입니다.

> 회사 이름, 재무 수치 등 실제 데이터는 이 저장소에 없습니다. `data/sample/`은 가상의 광고대행업 40인 회사를 기준으로 만든 예시입니다.

## 한눈에 보기

```
config/company_profile.json  ─┐
data/decisions.json (신청함/안함) ─┤
                                 ▼
 [수집] scan/fetch.js ──▶ [1차 필터] ──▶ [상세 수집] ──▶ [분석] scan/analyze.js (Claude)
   목록 21페이지               지역·키워드·기신청       자격요건 본문           가능/불가 판정 · 점수 · 의견
                                                                      │
                                                                      ▼
                                              data/YYYY-MM-DD.json ──▶ scripts/export_excel.js ──▶ reports/YYMMDD_지원사업검토내역.xlsx
                                                                   └─▶ scripts/build_site.js  ──▶ reports/index.html (대시보드)
```

- **수집**: 서버 렌더링 HTML을 `fetch` + `node-html-parser`로 파싱. URL 템플릿과 선택자는 `config/site.json`에만 있어서 다른 공고 사이트로 교체 가능.
- **판정**: 업종·소재지·규모·업력·인증 보유 현황을 대조해 **신청 가능 / 확인 필요 / 불가**를 먼저 가르고, 가능한 것만 100점 척도(자격 40 · 기대효과 35 · 실행 용이성 25)로 채점.
- **학습**: 대시보드에서 누른 **신청함**은 다음 주부터 같은 공고(원문 URL 기준)를 제외하고, **신청 안 함 + 사유**는 패턴을 분석해 비슷한 유형을 "추천 안함"으로 분류.
- **보고**: 핵심 요약(사실·수치) / 종합 의견(판단·근거) / 향후 계획(담당·기한)을 서로 겹치지 않게 작성. 엑셀 3시트, 흑백 대시보드, A4 신문판 PDF.

## 빠른 시작

```bash
git clone <this repo> && cd grant-scout
npm install
cp .env.example .env            # ANTHROPIC_API_KEY 입력
cp config/company_profile.sample.json config/company_profile.json   # 회사 조건 입력
npm run demo                    # 샘플 데이터로 엑셀·대시보드 생성 (API 호출 없음)
npm run scan:dry                # 수집·필터까지만 실행해 후보를 data/_candidates/ 에 저장 (API 호출 없음)
npm run weekly                  # 수집 → 분석 → 엑셀 → 대시보드 (Claude API 사용)
```

`reports/index.html`을 브라우저로 열면 대시보드가 보입니다. 우상단 **회사 조건 설정**은 `reports/conditions.html`로 연결됩니다.

## 회사 조건 관리

판정 기준은 전부 `config/company_profile.json` 한 파일입니다.

| 키 | 내용 |
|---|---|
| `industry`, `business_type`, `employees`, `size_class`, `location`, `district`, `founded_year` | 기본 정보 |
| `certifications[]` | 인증·자격 보유 현황 `{name, status: 보유/미보유/미확인, note}`. 인증이 필수인 공고는 보유→가능, 미확인→확인 필요, 미보유→불가 |
| `interests[]` | 찾고 싶은 지원 유형 (기대효과 점수의 기준) |
| `exclude_rules[]`, `exclude_keywords[]` | 점수와 무관하게 제외할 유형 |
| `facts[]` | "우리는 ~이다"로 적을 수 있는 사실 전부 (고용보험 성립일, 피보험자 수 등). 자격 대조에 그대로 사용 |
| `prefer_regions[]` | 목록 단계에서 남길 지역 표기 |
| `finance` (선택) | 재무 요약. `notes`만 판단 힌트로 API에 전달되고 수치는 전송하지 않음 |

`reports/conditions.html`에서 폼으로 편집한 뒤 **JSON 내려받기**로 받은 파일을 `config/company_profile.json`에 덮어쓰면 됩니다.

## 신청함 / 신청 안 함

대시보드의 각 공고에 **조건 확인 ↗ · 신청함 · 신청 안 함** 버튼이 있습니다. 기록은 브라우저에 저장되며 **신청 기록 내보내기**로 `decisions.json`을 받아 `data/decisions_export.json`으로 두면 다음 스캔에서 `scripts/sync_decisions.js`가 `data/decisions.json`에 합칩니다.

- 신청함: 원문 URL이 같은 공고는 다음 주부터 목록에서 빠지고 `skipped_applied`로만 집계됩니다. 같은 이름의 다른 회차는 새 공고로 검토합니다.
- 신청 안 함: 사유를 모아 `decline_insights`를 도출하고, 같은 패턴의 공고는 `추천 안함`으로 분류합니다.

## 자동 실행 (GitHub Actions)

`.github/workflows/weekly.yml`이 매주 금요일 09:00 KST에 실행됩니다.

1. 저장소 Settings → Secrets → `ANTHROPIC_API_KEY` 추가
2. Settings → Pages → Source를 **GitHub Actions**로 설정
3. Actions 탭에서 `weekly-scan`을 수동 실행(`workflow_dispatch`)해 첫 결과 확인

실행 결과(`data/*.json`, `reports/index.html`)는 저장소에 커밋되고 대시보드는 GitHub Pages로 배포됩니다. 엑셀 파일은 Actions 아티팩트 대신 대시보드의 **엑셀 내보내기**로 받는 것을 권합니다(브라우저에서 생성).

## 다른 사이트에 붙이기

`config/site.json`만 수정합니다.

- `list_url`: `{q}` `{cat}` `{page}` 자리표시자를 가진 목록 URL
- `detail_url`: `{id}` 자리표시자를 가진 상세 URL
- `selectors.card`: 목록의 공고 카드 선택자. 카드 안 텍스트 노드 순서가 `공고명 | 분야 | 지역 | 기관 | 접수상태 | 접수기간 | D-day`가 아니면 `scan/fetch.js`의 `parseList`에서 순서를 맞춰 주세요.
- `selectors.detail_main`, `detail_body_marker`: 상세 본문 영역과 본문 시작 표시 문구

클라이언트 렌더링 사이트라면 `fetch.js`의 `getHtml`을 Playwright 등으로 교체하면 됩니다.

## 폴더 구조

```
config/   company_profile.json (회사 조건) · site.json (사이트 어댑터)
scan/     index.js (파이프라인) · fetch.js (수집) · analyze.js (Claude 분석)
prompts/  analyst.md (분석 지시서)
scripts/  export_excel.js · build_site.js · build_conditions.js · sync_decisions.js · sync_profile.js
data/     YYYY-MM-DD.json (주차 결과) · decisions.json (신청 이력) · SCHEMA.md · sample/
reports/  index.html · conditions.html · YYMMDD_지원사업검토내역.xlsx
```

## 비용 메모

후보 100~150건을 한 번에 분석하면 요청당 입력 10만 토큰 안팎입니다. 시스템 프롬프트는 캐시되고, `GRANT_SCOUT_MAX_DETAIL`로 상세 확인 건수를 줄이면 비용이 비례해 내려갑니다. 모델은 `GRANT_SCOUT_MODEL`로 바꿀 수 있습니다.

## 라이선스

MIT
