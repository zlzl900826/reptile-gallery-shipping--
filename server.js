const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'rg2026!';
const APP_VERSION = 'v32-embedded-public-csv';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
console.log(`데이터 저장 위치: ${DB_PATH}`);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
const PUBLIC_DIR_CANDIDATES = [
  path.join(__dirname, 'public'),
  path.join(__dirname, 'reptile-gallery-shipping', 'public')
];
const PUBLIC_DIR = PUBLIC_DIR_CANDIDATES.find((dir) => fs.existsSync(path.join(dir, 'index.html'))) || path.join(__dirname, 'public');
console.log(`정적 파일 위치: ${PUBLIC_DIR}`);
console.log('public 폴더가 빠져도 내장 파일로 화면을 표시합니다.');

const EMBEDDED_PUBLIC = {"/index.html": "<!doctype html>\n<html lang=\"ko\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n  <title>렙타일갤러리 낙찰 결제 · 수령 신청</title>\n  <link rel=\"stylesheet\" href=\"/assets/style.css?v=32\">\n</head>\n<body>\n  <div class=\"shell\">\n    <header class=\"hero\">\n      <div>\n        <p class=\"eyebrow\">REPTILE GALLERY</p>\n        <h1 id=\"shopTitle\">낙찰 결제 · 수령 신청</h1>\n        <p id=\"shopSubtitle\" class=\"muted\">성함과 연락처를 입력한 뒤 낙찰 개체별로 결제/수령 신청을 진행해 주세요.</p>\n      </div>\n</header>\n\n    <section class=\"notice-card\">\n      <strong>안내</strong>\n      <p id=\"noticeText\">도도시 받는 곳 정거샵명을 직접 입력해 주세요. 도도시 배송비는 최종 결제금액에 포함되지 않습니다.</p>\n      <p class=\"tiny\" id=\"addressText\"></p>\n    </section>\n\n    <main class=\"grid user-grid\">\n      <section class=\"card search-card\">\n        <div class=\"section-title\">\n          <span class=\"step\">01</span>\n          <div>\n            <h2>낙찰자 조회</h2>\n            <p>라이브 경매 때 사용하신 성함과 연락처를 입력해 주세요. 낙찰 개체별로 신청 화면에 들어갈 수 있습니다.</p>\n          </div>\n        </div>\n        <form id=\"searchForm\" class=\"form-stack\">\n          <label>낙찰자 성함\n            <input id=\"nameInput\" type=\"text\" placeholder=\"예: 김철수\" autocomplete=\"name\" required>\n          </label>\n          <label>연락처 뒷자리 또는 전체번호\n            <input id=\"phoneInput\" type=\"tel\" placeholder=\"예: 5678 또는 01012345678\" required>\n          </label>\n          <button class=\"primary\" type=\"submit\">조회하기</button>\n          <p id=\"lookupNote\" class=\"tiny muted\">신청 페이지 조회는 등록일 기준 7일간 가능합니다.</p>\n        </form>\n      </section>\n\n      <section class=\"card result-card\">\n        <div class=\"section-title\">\n          <span class=\"step\">02</span>\n          <div>\n            <h2>결제/수령 신청</h2>\n            <p>조회 후 낙찰 개체마다 신청하기 버튼을 눌러 개체별 결제/수령 정보를 등록해 주세요.</p>\n          </div>\n        </div>\n        <div id=\"emptyState\" class=\"empty\">\n          <div class=\"empty-icon\">🦎</div>\n          <p>아직 조회된 낙찰자가 없습니다.</p>\n        </div>\n        <div id=\"resultArea\" class=\"hidden\"></div>\n      </section>\n    </main>\n  </div>\n\n  <script src=\"/assets/app.js?v=32\"></script>\n</body>\n</html>\n", "/admin.html": "<!doctype html>\n<html lang=\"ko\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n  <title>렙타일갤러리 결제/수령 관리자</title>\n  <link rel=\"stylesheet\" href=\"/assets/style.css?v=32\">\n</head>\n<body>\n  <div class=\"shell admin-shell\">\n    <header class=\"hero\">\n      <div>\n        <p class=\"eyebrow\">REPTILE GALLERY ADMIN</p>\n        <h1>결제/수령 관리자</h1>\n        <p class=\"muted\">낙찰자 등록, 개체별 결제 방식, 방문수령, 도도시 신청 현황을 관리합니다.</p>\n        <p class=\"version-badge\">v32 CSV 업로드 기능 적용됨</p>\n      </div>\n      <a class=\"admin-link\" href=\"/\">신청 페이지</a>\n    </header>\n\n    <section id=\"loginCard\" class=\"card login-card\">\n      <h2>관리자 로그인</h2>\n      <p class=\"muted\">기본 비밀번호는 <code>rg2026!</code> 입니다. Render 배포 시 환경변수 <code>ADMIN_PASSWORD</code>로 변경하세요.</p>\n      <form id=\"loginForm\" class=\"inline-form\">\n        <input id=\"passwordInput\" type=\"password\" placeholder=\"관리자 비밀번호\" required>\n        <button class=\"primary\" type=\"submit\">접속</button>\n      </form>\n      <p id=\"loginMessage\" class=\"form-message\"></p>\n    </section>\n\n    <main id=\"adminApp\" class=\"hidden\">\n\n      <section class=\"card csv-import-card\" id=\"csvImportCard\">\n        <div class=\"section-title\">\n          <span class=\"step\">CSV</span>\n          <div>\n            <h2>CSV 업로드 / 백업 복구</h2>\n            <p>CSV 다운로드로 백업한 파일을 그대로 업로드하면 낙찰자·개체·신청정보가 등록됩니다.</p>\n          </div>\n        </div>\n        <form id=\"csvImportForm\" class=\"form-stack\">\n          <label>CSV 파일 선택\n            <input id=\"csvImportFile\" type=\"file\" accept=\".csv,text/csv\" required>\n          </label>\n          <div class=\"two-col\">\n            <label>업로드 방식\n              <select id=\"csvImportMode\" name=\"mode\">\n                <option value=\"merge\">기존 자료 유지 + 추가/수정</option>\n                <option value=\"replace\">기존 낙찰자 전체 삭제 후 CSV로 교체</option>\n              </select>\n            </label>\n            <label>확인\n              <input value=\"관리자 CSV 다운로드 파일 그대로 업로드 가능\" disabled>\n            </label>\n          </div>\n          <div class=\"csv-import-actions\">\n            <button class=\"primary\" type=\"submit\">CSV 업로드 실행</button>\n            <button class=\"secondary\" type=\"button\" id=\"csvTemplateButton\">빈 CSV 양식 다운로드</button>\n          </div>\n          <p class=\"muted tiny\">전체 교체를 선택하면 현재 낙찰자 목록이 CSV 내용으로 바뀝니다. 먼저 CSV 다운로드로 백업하세요.</p>\n          <p id=\"csvImportMessage\" class=\"form-message\"></p>\n        </form>\n      </section>\n\n\n      <section class=\"grid admin-grid\">\n        <section class=\"card\">\n          <div class=\"section-title\">\n            <span class=\"step\">01</span>\n            <div>\n              <h2>낙찰자/개체 등록</h2>\n              <p>같은 이름과 번호로 추가 등록하면 자동으로 합쳐집니다.</p>\n            </div>\n          </div>\n          <form id=\"addForm\" class=\"form-stack\">\n            <div class=\"two-col\">\n              <label>낙찰자명<input name=\"name\" required placeholder=\"예: 김철수\"></label>\n              <label>연락처<input name=\"phone\" required placeholder=\"01012345678\"></label>\n            </div>\n            <label>출품 업체<input name=\"vendor\" placeholder=\"렙타일갤러리\"></label>\n            <div class=\"two-col\">\n              <label>경매 구분\n                <select name=\"auctionType\">\n                  <option value=\"\">선택</option>\n                  <option value=\"라이브경매\">라이브경매</option>\n                  <option value=\"밴드경매\">밴드경매</option>\n                </select>\n              </label>\n              <label>경매 날짜<input name=\"auctionDate\" type=\"date\"></label>\n            </div>\n            <label>낙찰 개체명<input name=\"title\" required placeholder=\"예: 아잔틱 크레스티드게코 1번\"></label>\n            <label>개체 정보<textarea name=\"detail\" rows=\"2\" placeholder=\"성별, 라인, 특이사항 등\"></textarea></label>\n            <label>낙찰 금액<input name=\"price\" type=\"number\" min=\"0\" step=\"10000\" required placeholder=\"500000\"></label>\n            <button class=\"primary\" type=\"submit\">등록하기</button>\n            <p id=\"addMessage\" class=\"form-message\"></p>\n          </form>\n        </section>\n\n        <section class=\"card\">\n          <div class=\"section-title\">\n            <span class=\"step\">02</span>\n            <div>\n              <h2>기본 설정</h2>\n              <p>할인율, 계좌, 문자 받을 번호를 관리합니다.</p>\n            </div>\n          </div>\n          <form id=\"settingsForm\" class=\"form-stack\">\n            <label>상호명<input name=\"shopName\"></label>\n            <label>페이지 제목<input name=\"subtitle\"></label>\n            <label>매장 주소<input name=\"shopAddress\"></label>\n            <label>입금 계좌<input name=\"bankInfo\"></label>\n            <label>신청 완료 문자 받을 번호<input name=\"smsPhone\" placeholder=\"01044456632\"></label>\n            <div class=\"three-col\">\n              <label>매장 방문수령 할인율(%)<input name=\"storePickupDiscountRate\" type=\"number\" min=\"0\" step=\"0.1\"></label>\n              <label>이체 할인율(%)<input name=\"transferDiscountRate\" type=\"number\" min=\"0\" step=\"0.1\"></label>\n              <label>피들 추가율(%)<input name=\"fiddleFeeRate\" type=\"number\" min=\"0\" step=\"0.1\"></label>\n              <label>신청페이지 조회 가능일<input name=\"userLookupDays\" type=\"number\" min=\"1\" step=\"1\" placeholder=\"7\"></label>\n            </div>\n            <label>신청 페이지 메모/요청사항 항목명<input name=\"memoRequestLabel\" placeholder=\"메모 또는 요청사항\"></label>\n            <label>신청 페이지 메모/요청사항 입력 안내문구\n              <textarea name=\"memoRequestPlaceholder\" rows=\"2\" placeholder=\"방문 가능 시간, 도도시 요청사항, 결제 관련 메모\"></textarea>\n            </label>\n            <label>공지<textarea name=\"notice\" rows=\"3\"></textarea></label>\n            <button class=\"primary\" type=\"submit\">설정 저장</button>\n            <p id=\"settingsMessage\" class=\"form-message\"></p>\n          </form>\n        </section>\n      </section>\n\n      <section class=\"card list-card\">\n        <div class=\"list-toolbar\">\n          <div>\n            <h2>낙찰자 목록</h2>\n            <p class=\"muted\">경매 날짜별·기간별로 검색하고, 날짜 색상·경매 구분·신청완료 수·미완료 개체·토탈 결제금액을 바로 확인할 수 있습니다.</p>\n          </div>\n          <div class=\"toolbar-actions\">\n            <input id=\"adminSearch\" type=\"search\" placeholder=\"이름/연락처/개체 검색\">\n            <input id=\"auctionDateFilter\" type=\"date\" title=\"경매 날짜 단일 검색\">\n            <div class=\"date-range-filter\" title=\"경매 날짜 기간별 검색\">\n              <input id=\"auctionDateStartFilter\" type=\"date\" aria-label=\"경매 시작일\">\n              <span>~</span>\n              <input id=\"auctionDateEndFilter\" type=\"date\" aria-label=\"경매 종료일\">\n            </div>\n            <button id=\"clearFilterButton\" class=\"secondary\" type=\"button\">검색 초기화</button>\n            <button id=\"csvButton\" class=\"secondary\" type=\"button\">CSV 다운로드</button>\n            <button id=\"csvImportJumpButton\" class=\"primary\" type=\"button\">CSV 업로드</button>\n          </div>\n        </div>\n        <div class=\"auction-filter-box\">\n          <div class=\"auction-filter-head\">\n            <strong>경매 날짜 빠른 선택</strong>\n            <span class=\"muted tiny\">날짜에 마우스를 올리면 라이브경매/밴드경매 구분이 표시됩니다.</span>\n          </div>\n          <div id=\"auctionDateQuickList\" class=\"auction-date-quick-list\"></div>\n        </div>\n        <div id=\"overallSummary\" class=\"overall-summary\"></div>\n        <div id=\"adminList\" class=\"admin-list\"></div>\n      </section>\n    </main>\n  </div>\n\n  <template id=\"adminCardTemplate\">\n    <article class=\"admin-bidder\">\n      <div class=\"admin-bidder-head\">\n        <div>\n          <h3 class=\"admin-name\"></h3>\n          <p class=\"admin-meta muted\"></p>\n        </div>\n        <div class=\"admin-head-actions\">\n          <button class=\"danger\" type=\"button\" data-action=\"delete-bidder\">낙찰자 삭제</button>\n        </div>\n      </div>\n      <div class=\"admin-summary\"></div>\n      <div class=\"admin-items\"></div>\n    </article>\n  </template>\n\n  <script src=\"/assets/admin.js?v=32\"></script>\n</body>\n</html>\n", "/assets/admin.js": "const money = new Intl.NumberFormat('ko-KR');\nlet PASSWORD = sessionStorage.getItem('rgAdminPassword') || '';\nlet STATE = { bidders: [], settings: {} };\nlet RECENTLY_ADDED_BIDDER_ID = '';\nlet RECENTLY_SAVED_ITEM_ID = '';\n\nfunction won(value) { return `${money.format(Math.round(Number(value || 0)))}원`; }\nfunction qs(selector, root = document) { return root.querySelector(selector); }\nfunction qsa(selector, root = document) { return [...root.querySelectorAll(selector)]; }\nfunction escapeHtml(value = '') {\n  return String(value ?? '')\n    .replace(/&/g, '&amp;')\n    .replace(/</g, '&lt;')\n    .replace(/>/g, '&gt;')\n    .replace(/\"/g, '&quot;')\n    .replace(/'/g, '&#39;');\n}\nfunction safeText(value = '') { return escapeHtml(value); }\n\nasync function api(path, options = {}) {\n  const res = await fetch(path, {\n    headers: {\n      'Content-Type': 'application/json',\n      'x-admin-password': PASSWORD,\n      ...(options.headers || {})\n    },\n    ...options\n  });\n  const contentType = res.headers.get('content-type') || '';\n  const data = contentType.includes('application/json') ? await res.json() : await res.text();\n  if (!res.ok) throw new Error(data.message || '요청을 처리하지 못했습니다.');\n  return data;\n}\n\nfunction itemTotal(bidder) {\n  return (bidder.items || []).reduce((sum, item) => sum + Number(item.price || 0), 0);\n}\nfunction finalTotal(bidder) {\n  return Number(bidder.totals?.finalTotal ?? bidder.shipping?.paymentSummary?.finalTotal ?? itemTotal(bidder));\n}\nfunction getItemApplication(bidder, itemId) {\n  return bidder?.itemApplications?.[itemId] || null;\n}\nfunction normalizePaymentMethod(method) {\n  if (method === '카드/피들') return '피들';\n  if (['이체', '카드', '피들'].includes(method)) return method;\n  return '';\n}\n\nasync function loadAdmin() {\n  const data = await api('/api/admin/bidders');\n  STATE = data;\n  populateSettings(data.settings || {});\n  renderList();\n}\n\nfunction populateSettings(settings) {\n  const form = qs('#settingsForm');\n  Object.entries(settings).forEach(([key, value]) => {\n    const input = qs(`[name=\"${key}\"]`, form);\n    if (input && key !== 'dodosiStations') input.value = value ?? '';\n  });\n}\n\nfunction paymentLabel(method) {\n  if (method === '카드/피들' || method === '피들') return '피들 3.3% 추가';\n  if (method === '카드') return '카드 추가/할인 없음';\n  if (method === '이체') return '이체 5% 할인';\n  return '미선택';\n}\n\nfunction getDateFilters() {\n  return {\n    single: qs('#auctionDateFilter')?.value || '',\n    start: qs('#auctionDateStartFilter')?.value || '',\n    end: qs('#auctionDateEndFilter')?.value || ''\n  };\n}\n\nfunction itemMatchesDate(item, filters = getDateFilters()) {\n  const date = item.auctionDate || '';\n  if (filters.single && date !== filters.single) return false;\n  if (filters.start && (!date || date < filters.start)) return false;\n  if (filters.end && (!date || date > filters.end)) return false;\n  return true;\n}\n\nfunction dateFilterLabel() {\n  const filters = getDateFilters();\n  if (filters.single) return `${filters.single} 경매 검색 기준`;\n  if (filters.start && filters.end) return `${filters.start} ~ ${filters.end} 경매 기간 검색 기준`;\n  if (filters.start) return `${filters.start} 이후 경매 검색 기준`;\n  if (filters.end) return `${filters.end} 이전 경매 검색 기준`;\n  const keyword = qs('#adminSearch')?.value.trim() || '';\n  return keyword ? '검색 결과 기준' : '전체 낙찰자 기준';\n}\n\nfunction clearSingleDateFilter() {\n  const el = qs('#auctionDateFilter');\n  if (el) el.value = '';\n}\n\nfunction clearRangeDateFilter() {\n  const start = qs('#auctionDateStartFilter');\n  const end = qs('#auctionDateEndFilter');\n  if (start) start.value = '';\n  if (end) end.value = '';\n}\n\nfunction clearAllListFilters() {\n  const search = qs('#adminSearch');\n  const single = qs('#auctionDateFilter');\n  if (search) search.value = '';\n  if (single) single.value = '';\n  clearRangeDateFilter();\n}\n\nfunction scrollToAdminList() {\n  const target = qs('#overallSummary') || qs('#adminList');\n  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });\n}\n\nfunction openBidderItems(card) {\n  const itemsArea = qs('.admin-items', card);\n  const toggleButton = qs('[data-action=\"toggle-bidder-items\"]', card);\n  if (!itemsArea) return;\n  itemsArea.hidden = false;\n  itemsArea.classList.remove('is-collapsed');\n  if (toggleButton) toggleButton.textContent = '손님 현황 닫기';\n}\n\nfunction closeBidderItems(card) {\n  const itemsArea = qs('.admin-items', card);\n  const toggleButton = qs('[data-action=\"toggle-bidder-items\"]', card);\n  if (!itemsArea) return;\n  itemsArea.hidden = true;\n  itemsArea.classList.add('is-collapsed');\n  if (toggleButton) toggleButton.textContent = '손님 현황 열기';\n}\n\nfunction closeOtherBidderItems(targetCard) {\n  qsa('.admin-bidder').forEach((card) => {\n    if (card === targetCard) return;\n    closeBidderItems(card);\n    qsa('.item-edit-details', card).forEach((details) => {\n      details.open = false;\n    });\n    qsa('.admin-item-editor', card).forEach((itemCard) => {\n      itemCard.classList.remove('jump-highlight');\n    });\n  });\n}\n\nfunction scrollToAdminItem(bidderId, itemId) {\n  const target = qsa('.admin-item-editor').find((el) => {\n    return String(el.dataset.bidderId || '') === String(bidderId || '') &&\n      String(el.dataset.itemId || '') === String(itemId || '');\n  });\n\n  if (!target) return;\n\n  const bidderCard = target.closest('.admin-bidder');\n  if (bidderCard) {\n    closeOtherBidderItems(bidderCard);\n    openBidderItems(bidderCard);\n\n    // 같은 손님 안에서도 클릭한 개체만 열고 나머지 개체 수정창은 모두 닫기\n    qsa('.item-edit-details', bidderCard).forEach((details) => {\n      details.open = false;\n    });\n    qsa('.admin-item-editor', bidderCard).forEach((itemCard) => {\n      if (itemCard !== target) itemCard.classList.remove('jump-highlight');\n    });\n  }\n\n  target.scrollIntoView({ behavior: 'smooth', block: 'center' });\n  target.classList.add('jump-highlight');\n  const details = qs('.item-edit-details', target);\n  if (details) details.open = true;\n\n  window.setTimeout(() => {\n    target.classList.remove('jump-highlight');\n  }, 2400);\n}\n\nfunction renderSummaryJumpLinks(items) {\n  if (!items.length) return '없음';\n  const rows = items.slice(0, 12).map((entry) => `\n    <button class=\"summary-jump\" type=\"button\" data-bidder-id=\"${safeText(entry.bidderId)}\" data-item-id=\"${safeText(entry.itemId)}\">\n      ${safeText(entry.label)}\n    </button>\n  `).join('');\n  const more = items.length > 12 ? `<span class=\"summary-more\">외 ${items.length - 12}개</span>` : '';\n  return `<div class=\"summary-jump-list\">${rows}${more}</div>`;\n}\n\nfunction getVisibleItems(bidder) {\n  const filters = getDateFilters();\n  return (bidder.items || []).filter((item) => itemMatchesDate(item, filters));\n}\n\nfunction calculateAdminItemPayable(item, app, paymentMethod) {\n  const price = Number(item.price || 0);\n  const transferRate = Number(STATE.settings?.transferDiscountRate ?? 5) / 100;\n  const fiddleRate = Number(STATE.settings?.fiddleFeeRate ?? STATE.settings?.cardFiddleFeeRate ?? 3.3) / 100;\n  const pickupRate = Number(STATE.settings?.storePickupDiscountRate ?? 5) / 100;\n  let amount = price;\n  if (paymentMethod === '이체') amount *= (1 - transferRate);\n  if (paymentMethod === '피들') amount *= (1 + fiddleRate);\n  if (app?.method === '매장 방문수령') amount -= price * pickupRate;\n  return Math.max(0, Math.round(amount));\n}\n\nfunction isItemApplicationDone(app) {\n  if (!app) return false;\n  const status = String(app.status || '').trim();\n  return status !== '' && status !== '미신청';\n}\n\nfunction isItemPaymentComplete(app) {\n  if (!app) return false;\n  return String(app.status || '').trim() === '결제완료';\n}\n\nfunction getItemPayable(item, bidder) {\n  const app = getItemApplication(bidder, item.id) || null;\n  if (!isItemApplicationDone(app)) return 0;\n  const payments = bidder.payments || bidder.shipping?.payments || {};\n  const paymentMethod = normalizePaymentMethod(app.paymentMethod || payments[item.id] || '');\n  return Number(app.paymentSummary?.finalTotal ?? calculateAdminItemPayable(item, app, paymentMethod));\n}\n\nfunction getBidderProgress(bidder, items) {\n  const targetItems = items || bidder.items || [];\n  const doneItems = [];\n  const pendingItems = [];\n  let totalPayable = 0;\n\n  targetItems.forEach((item) => {\n    const app = getItemApplication(bidder, item.id);\n    if (isItemApplicationDone(app)) {\n      doneItems.push(item);\n      totalPayable += getItemPayable(item, bidder);\n    } else {\n      pendingItems.push(item);\n    }\n  });\n\n  return {\n    itemCount: targetItems.length,\n    doneCount: doneItems.length,\n    pendingCount: pendingItems.length,\n    doneItems,\n    pendingItems,\n    totalPayable\n  };\n}\n\nfunction itemTitleList(items) {\n  if (!items.length) return '없음';\n  return items.map((item) => item.title || '낙찰 개체').join(', ');\n}\n\n\nfunction auctionClass(types = []) {\n  const set = new Set(types.filter(Boolean));\n  if (set.has('라이브경매') && set.has('밴드경매')) return 'mixed';\n  if (set.has('라이브경매')) return 'live';\n  if (set.has('밴드경매')) return 'band';\n  return 'unknown';\n}\n\nfunction auctionLabel(types = []) {\n  const set = [...new Set(types.filter(Boolean))];\n  return set.length ? set.join(' / ') : '경매 구분 미입력';\n}\n\nfunction auctionTooltip({ date, types, items, doneCount, totalPayable }) {\n  const itemLines = items.map((item) => `- ${item.title || '낙찰 개체'} (${item.auctionType || '구분 미입력'})`).join('\\n');\n  return [\n    `경매 날짜: ${date || '날짜 미입력'}`,\n    `경매 구분: ${auctionLabel(types)}`,\n    `신청완료: ${doneCount}/${items.length}개`,\n    `토탈 결제금액: ${won(totalPayable)}`,\n    '낙찰 개체:',\n    itemLines || '- 없음'\n  ].join('\\n');\n}\n\nfunction getAuctionDateGroups(bidder, items) {\n  const map = new Map();\n  (items || []).forEach((item) => {\n    const dateKey = item.auctionDate || '날짜 미입력';\n    if (!map.has(dateKey)) map.set(dateKey, []);\n    map.get(dateKey).push(item);\n  });\n  return [...map.entries()].sort(([a], [b]) => {\n    if (a === '날짜 미입력') return 1;\n    if (b === '날짜 미입력') return -1;\n    return a.localeCompare(b);\n  }).map(([date, groupItems]) => {\n    const progress = getBidderProgress(bidder, groupItems);\n    const types = groupItems.map((item) => item.auctionType || '');\n    return { date, items: groupItems, types, progress };\n  });\n}\n\nfunction renderAuctionDateChips(bidder, items) {\n  const groups = getAuctionDateGroups(bidder, items);\n  if (!groups.length) return '<span class=\"muted tiny\">표시할 경매 날짜가 없습니다.</span>';\n  return groups.map((group) => {\n    const cls = auctionClass(group.types);\n    const title = safeText(auctionTooltip({\n      date: group.date,\n      types: group.types,\n      items: group.items,\n      doneCount: group.progress.doneCount,\n      totalPayable: group.progress.totalPayable\n    }));\n    return `\n      <span class=\"auction-date-chip ${cls}\" title=\"${title}\">\n        <span class=\"auction-date-main\">${safeText(group.date)}</span>\n        <small>${safeText(auctionLabel(group.types))}</small>\n        <em>완료 ${group.progress.doneCount}/${group.items.length} · ${won(group.progress.totalPayable)}</em>\n      </span>\n    `;\n  }).join('');\n}\n\nfunction getKeywordFilteredBidders() {\n  const keyword = qs('#adminSearch')?.value.trim().toLowerCase() || '';\n  return (STATE.bidders || []).filter((bidder) => {\n    const text = JSON.stringify(bidder).toLowerCase();\n    return !keyword || text.includes(keyword);\n  });\n}\n\nfunction getAuctionDateQuickGroups() {\n  const map = new Map();\n  const bidders = getKeywordFilteredBidders();\n  bidders.forEach((bidder) => {\n    (bidder.items || []).forEach((item) => {\n      if (!item.auctionDate) return;\n      if (!map.has(item.auctionDate)) map.set(item.auctionDate, []);\n      map.get(item.auctionDate).push({ bidder, item });\n    });\n  });\n  return [...map.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([date, entries]) => {\n    const items = entries.map((entry) => entry.item);\n    const types = items.map((item) => item.auctionType || '');\n    const liveCount = items.filter((item) => item.auctionType === '라이브경매').length;\n    const bandCount = items.filter((item) => item.auctionType === '밴드경매').length;\n    const unknownCount = items.length - liveCount - bandCount;\n    const bidderNames = [...new Set(entries.map((entry) => entry.bidder.name || '낙찰자'))];\n    return { date, entries, items, types, liveCount, bandCount, unknownCount, bidderNames };\n  });\n}\n\nfunction quickDateTooltip(group) {\n  const itemLines = group.entries\n    .slice(0, 12)\n    .map(({ bidder, item }) => `- ${bidder.name || '낙찰자'}: ${item.title || '낙찰 개체'} (${item.auctionType || '구분 미입력'})`)\n    .join('\\n');\n  const more = group.entries.length > 12 ? `\\n- 외 ${group.entries.length - 12}개` : '';\n  return [\n    `경매 날짜: ${group.date}`,\n    `경매 구분: ${auctionLabel(group.types)}`,\n    `라이브경매: ${group.liveCount}개`,\n    `밴드경매: ${group.bandCount}개`,\n    group.unknownCount ? `구분 미입력: ${group.unknownCount}개` : '',\n    `낙찰자: ${group.bidderNames.join(', ')}`,\n    '낙찰 개체:',\n    `${itemLines}${more}`\n  ].filter(Boolean).join('\\n');\n}\n\nfunction renderAuctionDateQuickList() {\n  const box = qs('#auctionDateQuickList');\n  if (!box) return;\n  const groups = getAuctionDateQuickGroups();\n  const filters = getDateFilters();\n  const current = filters.single;\n  if (!groups.length) {\n    box.innerHTML = '<span class=\"muted tiny\">등록된 경매 날짜가 없습니다.</span>';\n    return;\n  }\n  box.innerHTML = groups.map((group) => {\n    const cls = auctionClass(group.types);\n    const active = group.date === current ? 'active' : '';\n    const title = safeText(quickDateTooltip(group));\n    return `\n      <button class=\"auction-date-quick ${cls} ${active}\" type=\"button\" data-date=\"${safeText(group.date)}\" title=\"${title}\">\n        <strong>${safeText(group.date)}</strong>\n        <small>${safeText(auctionLabel(group.types))}</small>\n        <em>총 ${group.items.length}개 · 라이브 ${group.liveCount} · 밴드 ${group.bandCount}</em>\n      </button>\n    `;\n  }).join('');\n\n  qsa('.auction-date-quick', box).forEach((button) => {\n    button.addEventListener('click', () => {\n      qs('#auctionDateFilter').value = button.dataset.date || '';\n      clearRangeDateFilter();\n      renderList();\n    });\n  });\n}\n\nfunction setSelectValue(root, name, value) {\n  const el = qs(`[name=\"${name}\"]`, root);\n  if (el) el.value = value ?? '';\n}\n\nfunction renderItem(item, bidder) {\n  const card = document.createElement('div');\n  card.className = 'item-card admin-item-editor clean-item-card';\n  card.dataset.bidderId = bidder.id || '';\n  card.dataset.itemId = item.id || '';\n  if (RECENTLY_SAVED_ITEM_ID === item.id) card.classList.add('recently-saved');\n  const payments = bidder.payments || bidder.shipping?.payments || {};\n  const app = getItemApplication(bidder, item.id) || {};\n  const paymentMethod = normalizePaymentMethod(app.paymentMethod || payments[item.id] || '');\n  const status = app.status || '미신청';\n  const payable = app.paymentSummary?.finalTotal || calculateAdminItemPayable(item, app, paymentMethod);\n  const memoPreview = String(app.memo || '').trim();\n\n  const itemAuctionCls = auctionClass([item.auctionType || '']);\n  const itemAuctionTitle = safeText(`${item.auctionDate || '날짜 미입력'} · ${item.auctionType || '경매 구분 미입력'}`);\n  const statusClass = status === '결제완료' ? 'ok' : (status === '미신청' ? 'warn' : 'normal');\n\n  card.innerHTML = `\n    <form class=\"item-edit-form form-stack\">\n      <div class=\"item-edit-head clean-item-head\">\n        <div class=\"item-clean-main\">\n          <div class=\"item-title-row\">\n            <strong>${safeText(item.title || '낙찰 개체')}</strong>\n            <span class=\"status-mini ${statusClass}\">${safeText(status)}</span>\n          </div>\n          <div class=\"item-auction-line\">\n            <span class=\"auction-date-pill ${itemAuctionCls}\" title=\"${itemAuctionTitle}\">${safeText(item.auctionDate || '날짜 미입력')}</span>\n            <span class=\"muted tiny\">${safeText(item.auctionType || '경매 구분 미입력')} · ${safeText(paymentLabel(paymentMethod))}</span>\n          </div>\n          <div class=\"clean-info-line\">\n            ${app.method ? `<span>${safeText(app.method)}</span>` : '<span>수령 미선택</span>'}\n            ${app.pickupDate ? `<span>방문일 ${safeText(app.pickupDate)}</span>` : ''}\n            ${app.dodosiTo ? `<span>도도시 ${safeText(app.dodosiTo)}</span>` : ''}\n            ${memoPreview ? `<span class=\"memo-preview\" title=\"${safeText(memoPreview)}\">요청사항: ${safeText(memoPreview.length > 28 ? memoPreview.slice(0, 28) + '...' : memoPreview)}</span>` : '<span class=\"muted\">요청사항 없음</span>'}\n          </div>\n        </div>\n        <div class=\"price-stack\">\n          <span class=\"price\">${won(item.price)}</span>\n          ${app.itemId ? `<span class=\"muted tiny\">결제금액 ${won(payable)}</span>` : '<span class=\"muted tiny\">미신청</span>'}\n        </div>\n      </div>\n\n      <details class=\"item-edit-details\">\n        <summary>개체별 수정 / 요청사항 수정</summary>\n        <div class=\"form-stack item-edit-body\">\n          <div class=\"two-col\">\n            <label>낙찰 개체명<input name=\"title\" required value=\"${safeText(item.title || '')}\"></label>\n            <label>낙찰 금액<input name=\"price\" type=\"number\" min=\"0\" step=\"10000\" value=\"${Number(item.price || 0)}\"></label>\n          </div>\n          <div class=\"three-col\">\n            <label>경매 구분\n              <select name=\"auctionType\">\n                <option value=\"\">선택</option>\n                <option value=\"라이브경매\">라이브경매</option>\n                <option value=\"밴드경매\">밴드경매</option>\n              </select>\n            </label>\n            <label>경매 날짜<input name=\"auctionDate\" type=\"date\" value=\"${safeText(item.auctionDate || '')}\"></label>\n            <label>출품 업체<input name=\"vendor\" value=\"${safeText(item.vendor || '렙타일갤러리')}\"></label>\n          </div>\n          <label>개체 정보<textarea name=\"detail\" rows=\"2\">${safeText(item.detail || '')}</textarea></label>\n\n          <div class=\"three-col\">\n            <label>결제방식\n              <select name=\"paymentMethod\">\n                <option value=\"\">미선택</option>\n                <option value=\"이체\">이체 5% 할인</option>\n                <option value=\"카드\">카드 추가/할인 없음</option>\n                <option value=\"피들\">피들 3.3% 추가</option>\n              </select>\n            </label>\n            <label>수령방법\n              <select name=\"method\">\n                <option value=\"\">미선택</option>\n                <option value=\"매장 방문수령\">매장 방문수령</option>\n                <option value=\"도도시\">도도시</option>\n              </select>\n            </label>\n            <label>상태\n              <select name=\"status\">\n                <option>미신청</option>\n                <option>신청완료</option>\n                <option>확인중</option>\n                <option>결제대기</option>\n                <option>결제완료</option>\n                <option>도도시예약완료</option>\n                <option>방문수령완료</option>\n              </select>\n            </label>\n          </div>\n\n          <div class=\"two-col\">\n            <label>방문수령 날짜<input name=\"pickupDate\" type=\"date\" value=\"${safeText(app.pickupDate || '')}\"></label>\n            <label>도도시 받는곳<input name=\"dodosiTo\" value=\"${safeText(app.dodosiTo || '')}\" placeholder=\"손님이 입력한 받는 정거샵명\"></label>\n          </div>\n          <label>메모 또는 요청사항\n            <textarea name=\"memo\" rows=\"3\" placeholder=\"손님 신청 페이지 메모/요청사항 수정 가능\">${safeText(app.memo || '')}</textarea>\n          </label>\n\n          <div class=\"admin-actions\">\n            <button class=\"primary\" type=\"submit\">개체 저장</button>\n            <button class=\"danger\" type=\"button\" data-action=\"delete-item\">개체 삭제</button>\n          </div>\n          <p class=\"form-message\"></p>\n        </div>\n      </details>\n    </form>\n  `;\n\n  const form = qs('.item-edit-form', card);\n  setSelectValue(form, 'auctionType', item.auctionType || '');\n  setSelectValue(form, 'paymentMethod', paymentMethod || '');\n  setSelectValue(form, 'method', app.method || '');\n  setSelectValue(form, 'status', status);\n\n  form.addEventListener('submit', async (event) => {\n    event.preventDefault();\n    const msg = qs('.form-message', form);\n    msg.className = 'form-message';\n    msg.textContent = '저장 중...';\n    const payload = Object.fromEntries(new FormData(form).entries());\n    payload.price = Number(payload.price || 0);\n    try {\n      await api(`/api/admin/bidders/${bidder.id}/items/${item.id}`, { method: 'PATCH', body: JSON.stringify(payload) });\n      RECENTLY_SAVED_ITEM_ID = item.id;\n      msg.classList.add('ok');\n      msg.textContent = '개체 정보와 요청사항이 저장되었습니다.';\n      await loadAdmin();\n    } catch (err) {\n      msg.classList.add('err');\n      msg.textContent = err.message;\n    }\n  });\n\n  qs('[data-action=\"delete-item\"]', card).addEventListener('click', async () => {\n    if (!confirm('이 낙찰 개체를 삭제할까요? 개체가 1개뿐이면 낙찰자도 함께 삭제됩니다.')) return;\n    await api(`/api/admin/bidders/${bidder.id}/items/${item.id}`, { method: 'DELETE' });\n    await loadAdmin();\n  });\n\n  return card;\n}\n\nfunction renderAdminCard(bidder) {\n  const template = qs('#adminCardTemplate').content.cloneNode(true);\n  const card = qs('.admin-bidder', template);\n  card.dataset.bidderId = bidder.id || '';\n  if (RECENTLY_ADDED_BIDDER_ID === bidder.id) card.classList.add('recently-added');\n  const visibleItems = getVisibleItems(bidder);\n  const progress = getBidderProgress(bidder, visibleItems);\n  const filters = getDateFilters();\n  const activeDateLabel = (filters.single || filters.start || filters.end) ? ` · ${dateFilterLabel()}` : '';\n\n  qs('.admin-name', card).textContent = bidder.name;\n  qs('.admin-meta', card).innerHTML = `\n    <span>${safeText(bidder.phone || '')}</span>\n    ${activeDateLabel ? `<span>${safeText(activeDateLabel.replace(/^ · /, ''))}</span>` : ''}\n    <span>낙찰개체 ${progress.itemCount}개</span>\n  `;\n\n  const headActions = qs('.admin-head-actions', card);\n  if (headActions) {\n    headActions.insertAdjacentHTML('afterbegin', '<button class=\"secondary\" type=\"button\" data-action=\"toggle-bidder-items\">손님 현황 열기</button>');\n  }\n\n  const summaryArea = qs('.admin-summary', card);\n  summaryArea.classList.add('admin-summary-clean');\n  summaryArea.innerHTML = `\n    <div class=\"summary-chip ${progress.pendingCount ? 'warn' : 'ok'}\"><span>신청완료</span><strong>${progress.doneCount}/${progress.itemCount}개</strong></div>\n    <div class=\"summary-chip total\"><span>토탈 결제금액</span><strong>${won(progress.totalPayable)}</strong></div>\n    <div class=\"summary-chip\"><span>미완료 수</span><strong>${progress.pendingCount}개</strong></div>\n    <div class=\"summary-wide auction-date-summary\">\n      <span>경매 날짜</span>\n      <div class=\"auction-date-cells\">${renderAuctionDateChips(bidder, visibleItems)}</div>\n    </div>\n    <div class=\"summary-wide ${progress.pendingCount ? 'warn' : 'ok'}\">\n      <span>미완료 개체</span>\n      <strong>${safeText(itemTitleList(progress.pendingItems))}</strong>\n    </div>\n  `;\n\n  const itemsArea = qs('.admin-items', card);\n  visibleItems.forEach((item) => itemsArea.appendChild(renderItem(item, bidder)));\n\n  const shouldOpenItems = RECENTLY_ADDED_BIDDER_ID === bidder.id || visibleItems.some((item) => item.id === RECENTLY_SAVED_ITEM_ID);\n  if (shouldOpenItems) openBidderItems(card);\n  else closeBidderItems(card);\n\n  const toggleItemsButton = qs('[data-action=\"toggle-bidder-items\"]', card);\n  if (toggleItemsButton) {\n    toggleItemsButton.addEventListener('click', () => {\n      if (itemsArea.hidden) {\n        closeOtherBidderItems(card);\n        qsa('.item-edit-details', card).forEach((details) => {\n          details.open = false;\n        });\n        openBidderItems(card);\n      } else {\n        closeBidderItems(card);\n        qsa('.item-edit-details', card).forEach((details) => {\n          details.open = false;\n        });\n      }\n    });\n  }\n\n  qs('[data-action=\"delete-bidder\"]', card).addEventListener('click', async () => {\n    if (!confirm(`${bidder.name} 낙찰자를 삭제할까요?`)) return;\n    await api(`/api/admin/bidders/${bidder.id}`, { method: 'DELETE' });\n    await loadAdmin();\n  });\n  return card;\n}\n\nfunction getFilteredBidders() {\n  const filters = getDateFilters();\n  return getKeywordFilteredBidders().filter((bidder) => {\n    return (bidder.items || []).some((item) => itemMatchesDate(item, filters));\n  });\n}\n\nfunction getOverallProgress(bidders) {\n  const summary = {\n    bidderCount: bidders.length,\n    itemCount: 0,\n    doneCount: 0,\n    pendingCount: 0,\n    paymentCompleteCount: 0,\n    paymentCompleteTotal: 0,\n    totalPayable: 0,\n    pendingLabels: [],\n    paymentPendingLabels: [],\n    filterLabel: dateFilterLabel()\n  };\n\n  bidders.forEach((bidder) => {\n    const visibleItems = getVisibleItems(bidder);\n    const progress = getBidderProgress(bidder, visibleItems);\n    summary.itemCount += progress.itemCount;\n    summary.doneCount += progress.doneCount;\n    summary.pendingCount += progress.pendingCount;\n    summary.totalPayable += progress.totalPayable;\n    visibleItems.forEach((item) => {\n      const app = getItemApplication(bidder, item.id);\n      if (isItemPaymentComplete(app)) {\n        summary.paymentCompleteCount += 1;\n        summary.paymentCompleteTotal += getItemPayable(item, bidder);\n      } else if (isItemApplicationDone(app)) {\n        summary.paymentPendingLabels.push({\n          label: `${bidder.name || '낙찰자'} - ${item.title || '낙찰 개체'}`,\n          bidderId: bidder.id,\n          itemId: item.id\n        });\n      }\n    });\n    progress.pendingItems.forEach((item) => {\n      summary.pendingLabels.push({\n        label: `${bidder.name || '낙찰자'} - ${item.title || '낙찰 개체'}`,\n        bidderId: bidder.id,\n        itemId: item.id\n      });\n    });\n  });\n\n  return summary;\n}\n\nfunction renderOverallSummary(bidders) {\n  const box = qs('#overallSummary');\n  if (!box) return;\n  const summary = getOverallProgress(bidders);\n  const pendingPreview = renderSummaryJumpLinks(summary.pendingLabels);\n  const paymentPendingPreview = renderSummaryJumpLinks(summary.paymentPendingLabels);\n\n  box.innerHTML = `\n    <div class=\"overall-summary-head\">\n      <div>\n        <p class=\"eyebrow\">TOTAL SUMMARY</p>\n        <h3>전체 신청 현황</h3>\n      </div>\n      <span class=\"overall-filter-label\">${safeText(summary.filterLabel)}</span>\n    </div>\n    <div class=\"overall-summary-grid\">\n      <div class=\"overall-stat\"><span>낙찰자</span><strong>${summary.bidderCount}명</strong></div>\n      <div class=\"overall-stat\"><span>낙찰개체</span><strong>${summary.itemCount}개</strong></div>\n      <div class=\"overall-stat ${summary.pendingCount ? 'warn' : 'ok'}\"><span>신청완료</span><strong>${summary.doneCount}/${summary.itemCount}개</strong></div>\n      <div class=\"overall-stat ${summary.paymentCompleteCount === summary.doneCount && summary.doneCount ? 'ok' : 'warn'}\"><span>결제완료</span><strong>${summary.paymentCompleteCount}/${summary.doneCount}개</strong></div>\n      <div class=\"overall-stat total\"><span>전체 토탈 결제금액</span><strong>${won(summary.totalPayable)}</strong></div>\n      <div class=\"overall-stat total payment-total\"><span>결제완료 금액</span><strong>${won(summary.paymentCompleteTotal)}</strong></div>\n    </div>\n    <div class=\"overall-pending ${summary.pendingCount ? 'warn' : 'ok'}\">\n      <span>미완료 개체</span>\n      <strong>${pendingPreview}</strong>\n    </div>\n    <div class=\"overall-pending ${summary.paymentPendingLabels.length ? 'warn' : 'ok'}\">\n      <span>신청완료 후 결제대기/확인중 개체</span>\n      <strong>${paymentPendingPreview}</strong>\n    </div>\n  `;\n\n  qsa('.summary-jump', box).forEach((button) => {\n    button.addEventListener('click', () => {\n      scrollToAdminItem(button.dataset.bidderId, button.dataset.itemId);\n    });\n  });\n}\n\nfunction renderList() {\n  const list = qs('#adminList');\n  list.innerHTML = '';\n  renderAuctionDateQuickList();\n  const bidders = getFilteredBidders();\n  renderOverallSummary(bidders);\n  if (!bidders.length) {\n    list.innerHTML = '<div class=\"empty\"><p>표시할 낙찰자가 없습니다.</p></div>';\n    return;\n  }\n  bidders.forEach((bidder) => list.appendChild(renderAdminCard(bidder)));\n}\n\nfunction showAdmin() {\n  qs('#loginCard').classList.add('hidden');\n  qs('#adminApp').classList.remove('hidden');\n}\n\nfunction collectForm(form) { return Object.fromEntries(new FormData(form).entries()); }\n\n\nfunction csvTemplateText() {\n  const headers = ['낙찰자명','전화번호','경매구분','경매날짜','낙찰개체','개체정보','업체','낙찰원금','결제방식','개체별 결제금액','수령방법','방문수령날짜','도도시 맡기는곳','도도시 받는곳','메모','상태','신청/수정일'];\n  const example = ['김철수','01012345678','라이브경매','2026-07-30','아잔틱 크레스티드게코 1번','성별/라인/특이사항','렙타일갤러리','500000','이체','','매장 방문수령','2026-08-01','렙타일갤러리-화성 봉담','','방문 시간 요청','신청완료',''];\n  return '\\ufeff' + [headers, example].map((row) => row.map((value) => {\n    const text = String(value ?? '');\n    return /[\",\\n]/.test(text) ? `\"${text.replace(/\"/g, '\"\"')}\"` : text;\n  }).join(',')).join('\\n');\n}\n\nfunction downloadCsvTemplate() {\n  const blob = new Blob([csvTemplateText()], { type: 'text/csv;charset=utf-8' });\n  const url = URL.createObjectURL(blob);\n  const a = document.createElement('a');\n  a.href = url;\n  a.download = 'reptile-gallery-csv-upload-template.csv';\n  a.click();\n  URL.revokeObjectURL(url);\n}\n\nfunction readCsvFile(file) {\n  return new Promise((resolve, reject) => {\n    const reader = new FileReader();\n    reader.onload = () => resolve(String(reader.result || ''));\n    reader.onerror = () => reject(new Error('CSV 파일을 읽지 못했습니다.'));\n    reader.readAsText(file, 'utf-8');\n  });\n}\n\nasync function uploadCsv(event) {\n  event.preventDefault();\n  const msg = qs('#csvImportMessage');\n  const file = qs('#csvImportFile')?.files?.[0];\n  const mode = qs('#csvImportMode')?.value || 'merge';\n\n  msg.className = 'form-message';\n  if (!file) {\n    msg.classList.add('err');\n    msg.textContent = 'CSV 파일을 선택해 주세요.';\n    return;\n  }\n  if (mode === 'replace' && !confirm('기존 낙찰자 목록을 전체 삭제하고 CSV 내용으로 교체합니다. 진행할까요?')) return;\n\n  msg.textContent = 'CSV 업로드 중...';\n  try {\n    const csvText = await readCsvFile(file);\n    const result = await api('/api/admin/import.csv', {\n      method: 'POST',\n      body: JSON.stringify({ csvText, mode })\n    });\n    STATE.bidders = result.bidders || [];\n    STATE.settings = result.settings || STATE.settings;\n    clearAllListFilters();\n    renderList();\n    event.currentTarget.reset();\n    msg.classList.add('ok');\n    msg.textContent = `CSV 업로드 완료: 낙찰자 ${result.biddersImported || 0}명, 개체 ${result.itemsImported || 0}개, 신청정보 ${result.applicationsImported || 0}개 반영${result.skipped ? `, 건너뜀 ${result.skipped}줄` : ''}`;\n  } catch (err) {\n    msg.classList.add('err');\n    msg.textContent = err.message;\n  }\n}\n\nfunction scrollToCsvImport() {\n  const target = qs('#csvImportCard');\n  if (!target) return;\n  target.scrollIntoView({ behavior: 'smooth', block: 'start' });\n  target.classList.add('jump-highlight');\n  setTimeout(() => target.classList.remove('jump-highlight'), 1800);\n}\n\nfunction downloadCsv() {\n  fetch('/api/admin/export.csv', { headers: { 'x-admin-password': PASSWORD } })\n    .then((res) => {\n      if (!res.ok) throw new Error('CSV 다운로드 실패');\n      return res.blob();\n    })\n    .then((blob) => {\n      const url = URL.createObjectURL(blob);\n      const a = document.createElement('a');\n      a.href = url;\n      a.download = 'reptile-gallery-payment-pickup.csv';\n      a.click();\n      URL.revokeObjectURL(url);\n    })\n    .catch((err) => alert(err.message));\n}\n\ndocument.addEventListener('DOMContentLoaded', async () => {\n  qs('#loginForm').addEventListener('submit', async (event) => {\n    event.preventDefault();\n    PASSWORD = qs('#passwordInput').value;\n    sessionStorage.setItem('rgAdminPassword', PASSWORD);\n    try {\n      await loadAdmin();\n      showAdmin();\n    } catch (err) {\n      qs('#loginMessage').className = 'form-message err';\n      qs('#loginMessage').textContent = err.message;\n    }\n  });\n\n  if (PASSWORD) {\n    try {\n      await loadAdmin();\n      showAdmin();\n    } catch {\n      sessionStorage.removeItem('rgAdminPassword');\n    }\n  }\n\n  qs('#addForm').addEventListener('submit', async (event) => {\n    event.preventDefault();\n    const msg = qs('#addMessage');\n    msg.className = 'form-message';\n    msg.textContent = '등록 중...';\n    const payload = collectForm(event.currentTarget);\n    payload.price = Number(payload.price || 0);\n    try {\n      const created = await api('/api/admin/bidders', { method: 'POST', body: JSON.stringify(payload) });\n      RECENTLY_ADDED_BIDDER_ID = created.bidder?.id || '';\n      event.currentTarget.reset();\n      clearAllListFilters();\n      msg.classList.add('ok');\n      msg.textContent = '등록되었습니다. 아래 낙찰자 목록에 자동 반영했습니다.';\n      await loadAdmin();\n      scrollToAdminList();\n    } catch (err) {\n      msg.classList.add('err');\n      msg.textContent = err.message;\n    }\n  });\n\n  qs('#settingsForm').addEventListener('submit', async (event) => {\n    event.preventDefault();\n    const msg = qs('#settingsMessage');\n    msg.className = 'form-message';\n    msg.textContent = '저장 중...';\n    const payload = collectForm(event.currentTarget);\n    payload.storePickupDiscountRate = Number(payload.storePickupDiscountRate || 0);\n    payload.transferDiscountRate = Number(payload.transferDiscountRate || 0);\n    payload.fiddleFeeRate = Number(payload.fiddleFeeRate || 0);\n    payload.cardFiddleFeeRate = payload.fiddleFeeRate;\n    payload.userLookupDays = Number(payload.userLookupDays || 7);\n    try {\n      await api('/api/settings', { method: 'PUT', body: JSON.stringify(payload) });\n      msg.classList.add('ok');\n      msg.textContent = '설정이 저장되었습니다.';\n      await loadAdmin();\n    } catch (err) {\n      msg.classList.add('err');\n      msg.textContent = err.message;\n    }\n  });\n\n  qs('#adminSearch').addEventListener('input', renderList);\n  qs('#auctionDateFilter').addEventListener('change', () => {\n    clearRangeDateFilter();\n    renderList();\n  });\n  ['#auctionDateStartFilter', '#auctionDateEndFilter'].forEach((selector) => {\n    qs(selector)?.addEventListener('change', () => {\n      clearSingleDateFilter();\n      renderList();\n    });\n  });\n  qs('#clearFilterButton').addEventListener('click', () => {\n    qs('#adminSearch').value = '';\n    qs('#auctionDateFilter').value = '';\n    clearRangeDateFilter();\n    renderList();\n  });\n  qs('#csvButton').addEventListener('click', downloadCsv);\n  qs('#csvImportForm')?.addEventListener('submit', uploadCsv);\n  qs('#csvTemplateButton')?.addEventListener('click', downloadCsvTemplate);\n  qs('#csvImportJumpButton')?.addEventListener('click', scrollToCsvImport);\n});\n", "/assets/app.js": "const money = new Intl.NumberFormat('ko-KR');\nlet SETTINGS = {};\nlet LAST_SEARCH_RESULTS = [];\nlet CURRENT_BIDDER = null;\n\nfunction won(value) { return `${money.format(Math.round(Number(value || 0)))}원`; }\nfunction qs(selector, root = document) { return root.querySelector(selector); }\nfunction qsa(selector, root = document) { return [...root.querySelectorAll(selector)]; }\nfunction safeText(value) { return String(value ?? '').replace(/[<>&\"']/g, (m) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '\"': '&quot;', \"'\": '&#39;' }[m])); }\n\nasync function api(path, options = {}) {\n  const res = await fetch(path, {\n    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },\n    ...options\n  });\n  const data = await res.json().catch(() => ({}));\n  if (!res.ok) throw new Error(data.message || '요청을 처리하지 못했습니다.');\n  return data;\n}\n\nfunction getRates() {\n  return {\n    pickupDiscount: Number(SETTINGS.storePickupDiscountRate ?? 5) / 100,\n    transferDiscount: Number(SETTINGS.transferDiscountRate ?? 5) / 100,\n    fiddleFee: Number(SETTINGS.fiddleFeeRate ?? SETTINGS.cardFiddleFeeRate ?? 3.3) / 100\n  };\n}\n\nfunction normalizePaymentMethod(method) {\n  if (method === '카드/피들') return '피들';\n  if (['이체', '카드', '피들'].includes(method)) return method;\n  return '이체';\n}\n\nfunction paymentMultiplier(method) {\n  const rates = getRates();\n  const normalized = normalizePaymentMethod(method);\n  if (normalized === '이체') return 1 - rates.transferDiscount;\n  if (normalized === '피들') return 1 + rates.fiddleFee;\n  return 1;\n}\n\nfunction stationId(region, name, address, index) {\n  return `${region}-${name}-${address}-${index}`.replace(/[^a-zA-Z0-9가-힣]+/g, '-').replace(/^-|-$/g, '') || `station-${index}`;\n}\n\nfunction parseStationText(text = '') {\n  return String(text || '').split(/\\r?\\n/).map((line, index) => {\n    const raw = line.trim();\n    if (!raw || raw.startsWith('#')) return null;\n    const [region = '', name = '', address = '', fee = '0'] = raw.split('|').map((part) => part.trim());\n    if (!name) return null;\n    return { id: stationId(region, name, address, index), region, name, address, fee: Number(String(fee).replace(/\\D/g, '') || 0) };\n  }).filter(Boolean);\n}\n\nfunction stationList() {\n  const parsed = parseStationText(SETTINGS.dodosiStationsText || '');\n  if (parsed.length) return parsed;\n  return Array.isArray(SETTINGS.dodosiStations) ? SETTINGS.dodosiStations : [];\n}\n\nfunction stationById(id) {\n  const list = stationList();\n  return list.find((station) => station.id === id) || list.find((station) => station.name === id);\n}\n\nfunction populateStations(select, selectedId = '') {\n  select.innerHTML = '<option value=\"\">받는 정거샵 선택</option>';\n  const stations = stationList();\n  if (!stations.length) {\n    const option = document.createElement('option');\n    option.value = '';\n    option.textContent = '등록된 정거샵이 없습니다';\n    select.appendChild(option);\n    return;\n  }\n  stations.forEach((station) => {\n    const option = document.createElement('option');\n    option.value = station.id;\n    option.textContent = `${station.region} · ${station.name}`;\n    select.appendChild(option);\n  });\n  select.value = selectedId || '';\n}\n\nfunction getItemApplication(bidder, itemId) {\n  return bidder?.itemApplications?.[itemId] || null;\n}\n\nfunction calculateSingleItemSummary(form) {\n  const price = Number(form.dataset.price || 0);\n  const method = qs('input[name=\"method\"]:checked', form)?.value || '';\n  const rawPaymentMethod = qs('[name=\"paymentMethod\"]', form)?.value || '';\n  const hasPaymentMethod = ['이체', '카드', '피들'].includes(rawPaymentMethod);\n  const paymentMethod = hasPaymentMethod ? normalizePaymentMethod(rawPaymentMethod) : '';\n  const afterPayment = hasPaymentMethod ? price * paymentMultiplier(paymentMethod) : null;\n  const pickupDiscount = method === '매장 방문수령' ? price * getRates().pickupDiscount : 0;\n  const finalTotal = hasPaymentMethod ? Math.max(0, Math.round(afterPayment - pickupDiscount)) : null;\n  return {\n    price: Math.round(price),\n    paymentMethod,\n    hasPaymentMethod,\n    method,\n    afterPayment: hasPaymentMethod ? Math.round(afterPayment) : null,\n    pickupDiscount: Math.round(pickupDiscount),\n    finalTotal\n  };\n}\n\nfunction paymentLabel(method) {\n  const normalized = normalizePaymentMethod(method);\n  if (normalized === '피들') return `피들 ${Number(SETTINGS.fiddleFeeRate ?? SETTINGS.cardFiddleFeeRate ?? 3.3)}% 추가`;\n  if (normalized === '카드') return '카드 추가/할인 없음';\n  return `이체 ${Number(SETTINGS.transferDiscountRate ?? 5)}% 할인`;\n}\n\nfunction auctionLine(item) {\n  if (!item?.auctionType && !item?.auctionDate) return '';\n  return `경매: ${item.auctionType || '구분 미입력'}${item.auctionDate ? ` · ${item.auctionDate}` : ''}`;\n}\n\nfunction renderSearchResults(bidders) {\n  const resultArea = qs('#resultArea');\n  const emptyState = qs('#emptyState');\n  resultArea.innerHTML = '';\n  emptyState.classList.add('hidden');\n  resultArea.classList.remove('hidden');\n\n  bidders.forEach((bidder) => {\n    const card = document.createElement('article');\n    card.className = 'bidder-panel bidder-list-panel';\n    card.innerHTML = `\n      <div class=\"bidder-head\">\n        <div>\n          <p class=\"eyebrow small\">낙찰 목록</p>\n          <h3>${safeText(bidder.name)} 님</h3>\n          <p class=\"muted\">${safeText(bidder.phone || '')}</p>\n        </div>\n        <span class=\"status-pill\">개체별 신청</span>\n      </div>\n      <div class=\"item-entry-list\"></div>\n    `;\n    const list = qs('.item-entry-list', card);\n    (bidder.items || []).forEach((item, index) => {\n      const app = getItemApplication(bidder, item.id);\n      const final = app?.paymentSummary?.finalTotal;\n      const itemCard = document.createElement('div');\n      itemCard.className = 'item-card item-entry-card';\n      itemCard.innerHTML = `\n        <div>\n          <strong>${index + 1}. ${safeText(item.title)}</strong>\n          <p class=\"muted tiny\">${safeText(item.vendor || '렙타일갤러리')} · ${safeText(item.detail || '상세 정보 없음')}</p>\n          ${auctionLine(item) ? `<p class=\"muted tiny\">${safeText(auctionLine(item))}</p>` : ''}\n          <p class=\"muted tiny\">상태: ${safeText(app?.status || '미신청')}${app ? ` · ${safeText(app.method || '')} · ${paymentLabel(app.paymentMethod)}` : ''}</p>\n          ${app ? `<p class=\"muted tiny\">신청 완료 금액: ${won(final || 0)}</p>` : ''}\n        </div>\n        <div class=\"item-actions\">\n          <span class=\"price\">${won(item.price)}</span>\n          <button class=\"primary\" type=\"button\">${app ? '수정하기' : '신청하기'}</button>\n        </div>\n      `;\n      qs('button', itemCard).addEventListener('click', () => renderItemApplication(bidder, item));\n      list.appendChild(itemCard);\n    });\n    resultArea.appendChild(card);\n  });\n}\n\nfunction syncConditionalSections(form) {\n  const method = qs('input[name=\"method\"]:checked', form)?.value || '';\n  qs('.pickup-section', form).classList.toggle('hidden', method !== '매장 방문수령');\n  qs('.dodosi-section', form).classList.toggle('hidden', method !== '도도시');\n}\n\nfunction syncDodosi(form) {\n  // 도도시 받는 곳은 손님이 직접 입력합니다. 주소/요금 자동 표시는 사용하지 않습니다.\n}\n\nfunction syncTotals(form) {\n  syncConditionalSections(form);\n  syncDodosi(form);\n  const summary = calculateSingleItemSummary(form);\n  qs('.item-total', form).textContent = won(summary.price);\n  qs('.payment-adjusted-total', form).textContent = summary.hasPaymentMethod ? won(summary.afterPayment) : '결제방식 선택 필요';\n  qs('.pickup-discount-total', form).textContent = summary.pickupDiscount ? `-${won(summary.pickupDiscount)}` : '0원';\n  qs('.final-total', form).textContent = summary.hasPaymentMethod ? won(summary.finalTotal) : '결제방식을 선택해 주세요';\n  const bankWrap = qs('.bank-info-wrap', form);\n  if (bankWrap) bankWrap.classList.toggle('hidden', summary.paymentMethod !== '이체');\n  return summary;\n}\n\nfunction buildSmsBody({ bidder, item, payload, summary }) {\n  const lines = [\n    '[렙타일갤러리 결제/수령 신청]',\n    `성함: ${bidder.name}`,\n    `연락처: ${bidder.phone || ''}`,\n    `낙찰개체: ${item.title}`,\n    item.auctionType ? `경매구분: ${item.auctionType}` : '',\n    item.auctionDate ? `경매날짜: ${item.auctionDate}` : '',\n    item.detail ? `개체정보: ${item.detail}` : '',\n    `낙찰금액: ${won(item.price)}`,\n    `결제방식: ${payload.paymentMethod}`,\n    `수령방법: ${payload.method}`,\n    payload.method === '매장 방문수령' ? `방문수령 희망일: ${payload.pickupDate}` : '',\n    payload.method === '도도시' ? `도도시 맡기는곳: ${payload.dodosiFrom}` : '',\n    payload.method === '도도시' ? `도도시 받는곳: ${payload.dodosiTo}` : '',\n    `최종 결제금액: ${won(summary.finalTotal)}`,\n    payload.paymentMethod === '이체' && SETTINGS.bankInfo ? `입금계좌: ${SETTINGS.bankInfo}` : '',\n    payload.memo ? `${SETTINGS.memoRequestLabel || '메모 또는 요청사항'}: ${payload.memo}` : ''\n  ].filter(Boolean);\n  return lines.join('\\n');\n}\n\nfunction openSmsApp(body) {\n  const recipient = String(SETTINGS.smsPhone || '').replace(/[^0-9+]/g, '');\n  const encoded = encodeURIComponent(body);\n  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);\n  const separator = isIOS ? '&' : '?';\n  const href = recipient ? `sms:${recipient}${separator}body=${encoded}` : `sms:${separator}body=${encoded}`;\n  window.location.href = href;\n  return href;\n}\n\nfunction renderItemApplication(bidder, item) {\n  CURRENT_BIDDER = bidder;\n  const resultArea = qs('#resultArea');\n  const app = getItemApplication(bidder, item.id) || {};\n  const memoRequestLabel = SETTINGS.memoRequestLabel || '메모 또는 요청사항';\n  const memoRequestPlaceholder = SETTINGS.memoRequestPlaceholder || '방문 가능 시간, 도도시 요청사항, 결제 관련 메모';\n  resultArea.innerHTML = '';\n\n  const panel = document.createElement('article');\n  panel.className = 'bidder-panel item-application-panel';\n  panel.innerHTML = `\n    <button class=\"secondary back-button\" type=\"button\">← 개체 목록으로 돌아가기</button>\n    <div class=\"bidder-head\">\n      <div>\n        <p class=\"eyebrow small\">개체별 신청</p>\n        <h3>${safeText(item.title)}</h3>\n        <p class=\"muted\">${safeText(bidder.name)} 님 · ${safeText(bidder.phone || '')}</p>\n      </div>\n      <span class=\"status-pill\">${safeText(app.status || '미신청')}</span>\n    </div>\n\n    <div class=\"item-card single-item-summary\">\n      <div>\n        <strong>${safeText(item.title)}</strong>\n        <p class=\"muted tiny\">${safeText(item.vendor || '렙타일갤러리')} · ${safeText(item.detail || '상세 정보 없음')}</p>\n        ${auctionLine(item) ? `<p class=\"muted tiny\">${safeText(auctionLine(item))}</p>` : ''}\n      </div>\n      <span class=\"price\">${won(item.price)}</span>\n    </div>\n\n    <form class=\"shipping-form form-stack\" data-price=\"${Number(item.price || 0)}\">\n      <label>결제 방식\n        <select name=\"paymentMethod\" required>\n          <option value=\"\">결제 방식을 선택해 주세요</option>\n          <option value=\"이체\">이체 (${Number(SETTINGS.transferDiscountRate ?? 5)}% 할인)</option>\n          <option value=\"카드\">카드 (추가/할인 없음)</option>\n          <option value=\"피들\">피들 (${Number(SETTINGS.fiddleFeeRate ?? SETTINGS.cardFiddleFeeRate ?? 3.3)}% 추가)</option>\n        </select>\n      </label>\n\n      <div class=\"method-box\">\n        <p class=\"label-title\">수령 방법 선택</p>\n        <div class=\"method-grid two-methods\">\n          <label><input type=\"radio\" name=\"method\" value=\"매장 방문수령\" required> 매장 방문수령 <span class=\"chip\">5% 할인</span></label>\n          <label><input type=\"radio\" name=\"method\" value=\"도도시\" required> 도도시</label>\n        </div>\n      </div>\n\n      <div class=\"pickup-section conditional-section hidden\">\n        <div class=\"section-subtitle\">매장 방문수령</div>\n        <label>방문수령 희망 날짜\n          <input name=\"pickupDate\" type=\"date\">\n        </label>\n        <p class=\"tiny muted\">방문수령 선택 시 낙찰금액에서 ${Number(SETTINGS.storePickupDiscountRate ?? 5)}% 할인이 적용됩니다.</p>\n      </div>\n\n      <div class=\"dodosi-section conditional-section hidden\">\n        <div class=\"section-subtitle\">도도시 신청 정보</div>\n        <div class=\"two-col\">\n          <label>맡기는 곳\n            <input name=\"dodosiFrom\" class=\"dodosi-from\" type=\"text\" readonly>\n          </label>\n          <label>받는 곳 정거샵\n            <input name=\"dodosiTo\" type=\"text\" placeholder=\"예: 티그리스게코[강동]\">\n          </label>\n        </div>\n        <p class=\"tiny muted\">도도시 받는 곳 정거샵명을 직접 입력해 주세요. 도도시 배송비는 최종 결제금액에 포함하지 않으며, 담당자 확인 후 별도 안내됩니다.</p>\n      </div>\n\n      <label>${safeText(memoRequestLabel)}\n        <textarea name=\"memo\" rows=\"3\" placeholder=\"${safeText(memoRequestPlaceholder)}\"></textarea>\n      </label>\n\n      <label class=\"bank-info-wrap\">입금 계좌\n        <input class=\"bank-info\" type=\"text\" readonly>\n      </label>\n\n      <div class=\"summary-box\">\n        <div><span>낙찰 원금</span><strong class=\"item-total\">0원</strong></div>\n        <div><span>결제방식 반영 금액</span><strong class=\"payment-adjusted-total\">0원</strong></div>\n        <div><span>매장 방문수령 할인</span><strong class=\"pickup-discount-total\">0원</strong></div>\n        <div class=\"grand\"><span>최종 결제금액</span><strong class=\"final-total\">0원</strong></div>\n      </div>\n\n      <button class=\"primary\" type=\"submit\">결제/수령 정보 등록 완료</button>\n      <p class=\"form-message\"></p>\n    </form>\n  `;\n\n  qs('.back-button', panel).addEventListener('click', () => renderSearchResults(LAST_SEARCH_RESULTS));\n\n  const form = qs('.shipping-form', panel);\n  qs('[name=\"paymentMethod\"]', form).value = app.paymentMethod ? normalizePaymentMethod(app.paymentMethod) : '';\n  qs('[name=\"pickupDate\"]', form).value = app.pickupDate || '';\n  qs('[name=\"memo\"]', form).value = app.memo || '';\n  qs('[name=\"dodosiFrom\"]', form).value = SETTINGS.dodosiDepositShop || '렙타일갤러리-화성 봉담';\n  qs('.bank-info', form).value = SETTINGS.bankInfo || '입금계좌 입력 필요';\n  if (qs('[name=\"dodosiTo\"]', form)) qs('[name=\"dodosiTo\"]', form).value = app.dodosiTo || '';\n\n  if (app.method) {\n    const selected = qs(`input[name=\"method\"][value=\"${CSS.escape(app.method)}\"]`, form);\n    if (selected) selected.checked = true;\n  }\n\n  form.addEventListener('change', () => syncTotals(form));\n  form.addEventListener('input', () => syncTotals(form));\n  syncTotals(form);\n\n  form.addEventListener('submit', async (event) => {\n    event.preventDefault();\n    const msg = qs('.form-message', form);\n    msg.className = 'form-message';\n    msg.textContent = '저장 중입니다...';\n\n    const method = qs('input[name=\"method\"]:checked', form)?.value || '';\n    const paymentMethod = qs('[name=\"paymentMethod\"]', form).value || '';\n    if (!['이체', '카드', '피들'].includes(paymentMethod)) {\n      msg.classList.add('err');\n      msg.textContent = '결제 방식을 선택해 주세요.';\n      return;\n    }\n    const summary = syncTotals(form);\n    const payload = {\n      method,\n      paymentMethod,\n      pickupDate: qs('[name=\"pickupDate\"]', form).value,\n      dodosiFrom: qs('[name=\"dodosiFrom\"]', form).value,\n      dodosiStationId: '',\n      dodosiTo: method === '도도시' ? (qs('[name=\"dodosiTo\"]', form).value || '').trim() : '',\n      dodosiRegion: '',\n      dodosiAddress: '',\n      memo: qs('[name=\"memo\"]', form).value\n    };\n\n    try {\n      const saved = await api(`/api/bidders/${bidder.id}/items/${item.id}/application`, {\n        method: 'POST',\n        body: JSON.stringify(payload)\n      });\n      msg.classList.add('ok');\n      const smsBody = buildSmsBody({ bidder, item, payload, summary });\n      const smsHref = openSmsApp(smsBody);\n      msg.innerHTML = `신청이 저장되었습니다. 휴대폰 문자 앱으로 이동합니다.<br><a href=\"${smsHref}\">문자 앱이 안 열리면 여기를 눌러주세요.</a>`;\n      qs('.status-pill', panel).textContent = '신청완료';\n      const index = LAST_SEARCH_RESULTS.findIndex((entry) => entry.id === bidder.id);\n      if (index >= 0) LAST_SEARCH_RESULTS[index] = saved.bidder;\n      CURRENT_BIDDER = saved.bidder;\n    } catch (err) {\n      msg.classList.add('err');\n      msg.textContent = err.message;\n    }\n  });\n\n  resultArea.appendChild(panel);\n  window.scrollTo({ top: resultArea.offsetTop - 16, behavior: 'smooth' });\n}\n\nasync function loadSettings() {\n  SETTINGS = await api('/api/settings');\n  document.title = `${SETTINGS.shopName || '렙타일갤러리'} 낙찰 결제/수령 신청`;\n  qs('#shopTitle').textContent = SETTINGS.subtitle || '낙찰 결제 · 수령 신청';\n  qs('#shopSubtitle').textContent = '성함과 연락처를 입력한 뒤 낙찰 개체별로 결제/수령 신청을 진행해 주세요.';\n  qs('#noticeText').textContent = SETTINGS.notice || '';\n  qs('#addressText').textContent = SETTINGS.shopAddress ? `매장 주소: ${SETTINGS.shopAddress}` : '';\n  const lookupDays = Number(SETTINGS.userLookupDays || 7);\n  const lookupNote = qs('#lookupNote');\n  if (lookupNote) lookupNote.textContent = `신청 페이지 조회는 등록일 기준 ${lookupDays}일간 가능합니다. 기간이 지나면 매장으로 문의해 주세요.`;\n}\n\ndocument.addEventListener('DOMContentLoaded', async () => {\n  await loadSettings();\n  const form = qs('#searchForm');\n  const resultArea = qs('#resultArea');\n  const emptyState = qs('#emptyState');\n\n  form.addEventListener('submit', async (event) => {\n    event.preventDefault();\n    const button = qs('button', form);\n    button.disabled = true;\n    button.textContent = '조회 중...';\n    resultArea.innerHTML = '';\n    try {\n      const name = qs('#nameInput').value.trim();\n      const phone = qs('#phoneInput').value.trim();\n      const data = await api(`/api/bidders/search?name=${encodeURIComponent(name)}&phone=${encodeURIComponent(phone)}`);\n      if (!data.bidders.length) {\n        LAST_SEARCH_RESULTS = [];\n        emptyState.classList.remove('hidden');\n        emptyState.innerHTML = '<div><div class=\"empty-icon\">🔎</div><p>조회된 낙찰 내역이 없습니다.<br>성함 또는 연락처를 다시 확인해 주세요.</p></div>';\n        resultArea.classList.add('hidden');\n        return;\n      }\n      LAST_SEARCH_RESULTS = data.bidders;\n      renderSearchResults(data.bidders);\n    } catch (err) {\n      LAST_SEARCH_RESULTS = [];\n      emptyState.classList.remove('hidden');\n      emptyState.innerHTML = `<div><div class=\"empty-icon\">⚠️</div><p>${safeText(err.message)}</p></div>`;\n      resultArea.classList.add('hidden');\n    } finally {\n      button.disabled = false;\n      button.textContent = '조회하기';\n    }\n  });\n});\n", "/assets/style.css": ":root {\n  --bg: #f5f1ea;\n  --card: #fffdf8;\n  --ink: #1f1f1f;\n  --muted: #7b746d;\n  --line: #e2d7ca;\n  --accent: #323232;\n  --accent-2: #b99b6b;\n  --soft: #ece4d8;\n  --danger: #b33a3a;\n  --ok: #25715f;\n  --shadow: 0 24px 70px rgba(31, 31, 31, .09);\n  --radius: 24px;\n}\n\n* { box-sizing: border-box; }\nbody {\n  margin: 0;\n  font-family: Pretendard, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif;\n  color: var(--ink);\n  background:\n    radial-gradient(circle at top left, rgba(185, 155, 107, .18), transparent 32rem),\n    linear-gradient(135deg, #f7f2ea, #eee6da 55%, #f9f7f2);\n  min-height: 100vh;\n}\n\n.shell {\n  width: min(1160px, calc(100% - 32px));\n  margin: 0 auto;\n  padding: 34px 0 72px;\n}\n\n.hero {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 24px;\n  padding: 34px;\n  border: 1px solid rgba(255,255,255,.66);\n  background: rgba(255,255,255,.54);\n  backdrop-filter: blur(18px);\n  border-radius: 32px;\n  box-shadow: var(--shadow);\n}\n\nh1, h2, h3, p { margin-top: 0; }\nh1 { font-size: clamp(2rem, 6vw, 4.6rem); letter-spacing: -0.06em; line-height: .98; margin-bottom: 14px; }\nh2 { font-size: 1.35rem; margin-bottom: 6px; }\nh3 { font-size: 1.15rem; margin-bottom: 4px; }\np { line-height: 1.6; }\n\n.eyebrow {\n  display: inline-flex;\n  align-items: center;\n  gap: 8px;\n  font-size: .76rem;\n  font-weight: 800;\n  letter-spacing: .22em;\n  color: var(--accent-2);\n  margin-bottom: 12px;\n}\n.eyebrow::before {\n  content: \"\";\n  width: 28px;\n  height: 1px;\n  background: currentColor;\n}\n.eyebrow.small { font-size: .68rem; margin-bottom: 4px; }\n\n.muted { color: var(--muted); }\n.tiny { font-size: .86rem; color: var(--muted); margin-bottom: 0; }\n.hidden { display: none !important; }\n\n.admin-link, .primary, .secondary, .danger {\n  border: none;\n  border-radius: 999px;\n  padding: 13px 18px;\n  font-weight: 800;\n  cursor: pointer;\n  text-decoration: none;\n  transition: transform .16s ease, box-shadow .16s ease, opacity .16s ease;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  white-space: nowrap;\n}\n.admin-link, .secondary {\n  color: var(--ink);\n  background: #fff;\n  border: 1px solid var(--line);\n}\n.primary {\n  color: #fff;\n  background: linear-gradient(135deg, #1e1e1e, #45413a);\n  box-shadow: 0 14px 28px rgba(31,31,31,.18);\n}\n.danger { color: #fff; background: var(--danger); }\nbutton:hover, .admin-link:hover { transform: translateY(-1px); }\n\n.notice-card, .card {\n  background: rgba(255,253,248,.92);\n  border: 1px solid rgba(226, 215, 202, .85);\n  border-radius: var(--radius);\n  box-shadow: 0 18px 54px rgba(31,31,31,.07);\n}\n.notice-card {\n  margin: 22px 0;\n  padding: 20px 24px;\n}\n.notice-card p { margin: 4px 0 0; }\n.card { padding: 26px; }\n\n.grid { display: grid; gap: 22px; }\n.user-grid { grid-template-columns: .8fr 1.2fr; align-items: start; }\n.admin-grid { grid-template-columns: 1fr 1fr; align-items: start; margin: 22px 0; }\n\n.section-title {\n  display: flex;\n  align-items: flex-start;\n  gap: 14px;\n  margin-bottom: 20px;\n}\n.section-title p { margin-bottom: 0; color: var(--muted); }\n.step {\n  flex: 0 0 auto;\n  width: 44px;\n  height: 44px;\n  border-radius: 50%;\n  display: grid;\n  place-items: center;\n  background: var(--soft);\n  color: var(--accent);\n  font-weight: 900;\n}\n\n.form-stack { display: grid; gap: 15px; }\nlabel { display: grid; gap: 8px; font-weight: 800; font-size: .92rem; }\ninput, textarea, select {\n  width: 100%;\n  border: 1px solid var(--line);\n  border-radius: 16px;\n  background: #fff;\n  color: var(--ink);\n  padding: 14px 15px;\n  font: inherit;\n  outline: none;\n}\ninput:focus, textarea:focus, select:focus { border-color: var(--accent-2); box-shadow: 0 0 0 4px rgba(185,155,107,.13); }\ntextarea { resize: vertical; }\n.inline-form { display: flex; gap: 10px; }\n.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }\n.form-message { margin: 0; font-size: .92rem; font-weight: 700; min-height: 1.2em; }\n.form-message.ok { color: var(--ok); }\n.form-message.err { color: var(--danger); }\n\n.empty { display: grid; place-items: center; text-align: center; min-height: 380px; color: var(--muted); border: 1px dashed var(--line); border-radius: 22px; background: rgba(236,228,216,.32); }\n.empty-icon { font-size: 3rem; margin-bottom: 10px; }\n\n.bidder-panel { display: grid; gap: 18px; }\n.bidder-head, .admin-bidder-head, .list-toolbar {\n  display: flex;\n  justify-content: space-between;\n  gap: 18px;\n  align-items: flex-start;\n}\n.status-pill {\n  border-radius: 999px;\n  padding: 7px 12px;\n  background: var(--soft);\n  color: var(--accent);\n  font-size: .82rem;\n  font-weight: 900;\n}\n.items-list, .admin-items { display: grid; gap: 10px; }\n.item-card {\n  padding: 14px;\n  border-radius: 18px;\n  border: 1px solid var(--line);\n  background: #fff;\n  display: flex;\n  justify-content: space-between;\n  gap: 14px;\n}\n.item-card strong { display: block; margin-bottom: 3px; }\n.price { font-weight: 900; white-space: nowrap; }\n\n.method-box {\n  padding: 16px;\n  border: 1px solid var(--line);\n  border-radius: 20px;\n  background: #fff;\n}\n.label-title { font-weight: 900; margin-bottom: 12px; }\n.method-grid { display: flex; flex-wrap: wrap; gap: 9px; }\n.method-grid label {\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  padding: 10px 12px;\n  border: 1px solid var(--line);\n  border-radius: 999px;\n  background: var(--card);\n  cursor: pointer;\n  font-weight: 800;\n}\n.method-grid input { width: auto; }\n\n.summary-box {\n  display: grid;\n  gap: 10px;\n  border-radius: 22px;\n  padding: 18px;\n  background: linear-gradient(135deg, #292929, #4b443a);\n  color: #fff;\n}\n.summary-box div { display: flex; justify-content: space-between; gap: 12px; }\n.summary-box span { opacity: .72; }\n.summary-box strong { font-size: 1.05rem; }\n.summary-box .grand { border-top: 1px solid rgba(255,255,255,.2); padding-top: 12px; }\n.summary-box .grand strong { font-size: 1.35rem; }\n\n.login-card { margin-top: 22px; }\n.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin: 22px 0; }\n.stat { padding: 20px; }\n.stat span { display: block; color: var(--muted); font-size: .92rem; margin-bottom: 6px; }\n.stat strong { font-size: 1.7rem; letter-spacing: -0.04em; }\n\n.list-card { margin-top: 22px; }\n.toolbar-actions { display: flex; gap: 10px; align-items: center; }\n.toolbar-actions input { min-width: 250px; }\n.date-range-filter {\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  padding: 0;\n}\n.date-range-filter input {\n  min-width: 148px;\n}\n.date-range-filter span {\n  color: var(--muted);\n  font-weight: 900;\n}\n\n.auction-filter-box {\n  margin-top: 14px;\n  padding: 14px;\n  border: 1px solid var(--line);\n  border-radius: 18px;\n  background: rgba(236,228,216,.34);\n}\n.auction-filter-head {\n  display: flex;\n  justify-content: space-between;\n  gap: 12px;\n  align-items: baseline;\n  margin-bottom: 10px;\n}\n.auction-date-quick-list {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 8px;\n}\n.auction-date-quick {\n  display: inline-flex;\n  flex-direction: column;\n  align-items: flex-start;\n  gap: 2px;\n  padding: 10px 12px;\n  border-radius: 16px;\n  border: 1px solid var(--line);\n  background: #fff;\n  color: var(--ink);\n  cursor: pointer;\n  text-align: left;\n  min-width: 170px;\n}\n.auction-date-quick strong { font-size: .95rem; }\n.auction-date-quick small, .auction-date-quick em {\n  font-size: 11px;\n  line-height: 1.2;\n  font-style: normal;\n}\n.auction-date-quick small { color: var(--muted); font-weight: 900; }\n.auction-date-quick em { color: var(--ink); opacity: .78; }\n.auction-date-quick.active { box-shadow: 0 0 0 3px rgba(32,32,32,.12); transform: translateY(-1px); }\n.auction-date-quick.live { background: rgba(37, 113, 95, .11); border-color: rgba(37, 113, 95, .38); color: #1f604f; }\n.auction-date-quick.band { background: rgba(64, 91, 151, .10); border-color: rgba(64, 91, 151, .34); color: #314a87; }\n.auction-date-quick.mixed { background: linear-gradient(135deg, rgba(37,113,95,.12), rgba(64,91,151,.12)); border-color: rgba(185,155,107,.45); color: #4b443a; }\n.auction-date-quick.unknown { background: rgba(179, 58, 58, .08); border-color: rgba(179, 58, 58, .22); color: #8a3333; }\n.admin-list { display: grid; gap: 16px; margin-top: 18px; }\n.admin-bidder {\n  border: 1px solid var(--line);\n  border-radius: 22px;\n  padding: 18px;\n  background: #fff;\n}\n.admin-total { text-align: right; font-weight: 900; }\n.admin-actions { display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; }\n.item-actions { display: flex; align-items: center; gap: 10px; }\n.icon-button {\n  border: 1px solid var(--line);\n  background: var(--card);\n  border-radius: 12px;\n  padding: 8px 10px;\n  cursor: pointer;\n}\ncode { background: var(--soft); padding: 2px 6px; border-radius: 6px; }\n\n@media (max-width: 860px) {\n  .hero, .bidder-head, .admin-bidder-head, .list-toolbar { flex-direction: column; }\n  .user-grid, .admin-grid, .stats-grid { grid-template-columns: 1fr; }\n  .two-col { grid-template-columns: 1fr; }\n  .toolbar-actions, .inline-form, .auction-filter-head, .date-range-filter { width: 100%; flex-direction: column; align-items: stretch; }\n  .toolbar-actions input, .inline-form input, .toolbar-actions button, .inline-form button, .auction-date-quick, .date-range-filter input { width: 100%; }\n  .shell { width: min(100% - 20px, 1160px); padding-top: 16px; }\n  .hero, .card { padding: 22px; }\n  .item-card { flex-direction: column; }\n}\n\n\n/* 결제/수령 신청 v2 */\n.method-grid.two-methods { grid-template-columns: repeat(2, minmax(0, 1fr)); }\n.chip { display: inline-block; margin-left: 6px; padding: 2px 7px; border-radius: 999px; background: rgba(37, 113, 95, .12); color: var(--ok); font-size: 12px; font-weight: 800; }\n.conditional-section { border: 1px solid var(--line); border-radius: 18px; padding: 16px; background: rgba(255,255,255,.54); }\n.section-subtitle { font-weight: 900; margin-bottom: 12px; }\n.dodosi-info-box { display: grid; gap: 10px; margin-top: 12px; }\n.dodosi-info-box > div { display: flex; justify-content: space-between; gap: 16px; padding: 12px 14px; border-radius: 14px; background: #fff; border: 1px solid var(--line); }\n.dodosi-info-box span { color: var(--muted); font-size: 13px; }\n.payment-item { align-items: stretch; }\n.item-main { min-width: 0; }\n.payment-row { margin-top: 10px; }\n.payment-row label { display: inline-grid; gap: 6px; font-size: 13px; color: var(--muted); }\n.payment-row select { min-width: 190px; }\n.price-stack { text-align: right; display: grid; gap: 4px; justify-items: end; }\n.three-col { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }\n@media (max-width: 760px) {\n  .method-grid.two-methods, .three-col { grid-template-columns: 1fr; }\n  .payment-item { grid-template-columns: 1fr; }\n  .price-stack { text-align: left; justify-items: start; }\n  .dodosi-info-box > div { display: grid; }\n}\n\n/* v4 개체별 신청 선택 */\n.select-item-row {\n  display: flex;\n  align-items: flex-start;\n  gap: 10px;\n  font-size: .95rem;\n}\n.select-item-row input { width: auto; margin-top: 3px; }\n.select-item-row small { display: block; margin-top: 3px; color: var(--muted); font-weight: 700; }\n.payment-item.is-unselected { opacity: .58; background: rgba(255,255,255,.62); }\n.selection-badge {\n  display: inline-flex;\n  align-items: center;\n  border-radius: 999px;\n  padding: 4px 8px;\n  font-size: 12px;\n  font-weight: 900;\n  background: rgba(37, 113, 95, .12);\n  color: var(--ok);\n  margin-left: 6px;\n}\n.selection-badge.off { background: rgba(179, 58, 58, .12); color: var(--danger); }\n\n/* v5 개체별 신청 페이지 */\n.item-entry-list { display: grid; gap: 12px; }\n.item-entry-card { align-items: center; }\n.item-entry-card .item-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }\n.back-button { width: fit-content; }\n.item-application-panel { gap: 16px; }\n.single-item-summary { align-items: center; }\n.dodosi-info-box > div:only-child { grid-template-columns: 1fr; }\n@media (max-width: 760px) {\n  .item-entry-card .item-actions { justify-content: flex-start; }\n  .back-button { width: 100%; }\n}\n\n/* v10 관리자 개체별 수정 */\n.admin-head-actions {\n  display: grid;\n  gap: 10px;\n  justify-items: end;\n}\n.admin-item-editor {\n  display: block;\n}\n.item-edit-form { width: 100%; }\n.item-edit-head {\n  display: flex;\n  justify-content: space-between;\n  align-items: flex-start;\n  gap: 14px;\n}\n.item-edit-details {\n  margin-top: 12px;\n  border-top: 1px dashed var(--line);\n  padding-top: 12px;\n}\n.item-edit-details summary {\n  cursor: pointer;\n  font-weight: 900;\n  color: var(--accent);\n}\n.item-edit-body { margin-top: 14px; }\n@media (max-width: 760px) {\n  .admin-head-actions { justify-items: stretch; width: 100%; }\n  .item-edit-head { flex-direction: column; }\n}\n\n/* 관리자 낙찰자별 진행 현황 v11 */\n.admin-summary {\n  display: grid;\n  grid-template-columns: repeat(6, minmax(0, 1fr));\n  gap: 10px;\n  margin: 14px 0 16px;\n}\n.summary-chip, .summary-wide {\n  border: 1px solid var(--line);\n  border-radius: 16px;\n  background: rgba(236,228,216,.28);\n  padding: 13px 14px;\n}\n.summary-chip span, .summary-wide span {\n  display: block;\n  color: var(--muted);\n  font-size: 12px;\n  font-weight: 800;\n  margin-bottom: 5px;\n}\n.summary-chip strong, .summary-wide strong {\n  font-size: 1.05rem;\n  font-weight: 900;\n}\n.summary-chip.ok, .summary-wide.ok {\n  background: rgba(37,113,95,.08);\n  border-color: rgba(37,113,95,.24);\n}\n.summary-chip.warn, .summary-wide.warn {\n  background: rgba(185,155,107,.11);\n  border-color: rgba(185,155,107,.34);\n}\n.summary-wide {\n  grid-column: 1 / -1;\n}\n.summary-wide strong {\n  display: block;\n  line-height: 1.45;\n}\n\n@media (max-width: 860px) {\n  .admin-summary { grid-template-columns: 1fr 1fr; }\n  .summary-wide { grid-column: 1 / -1; }\n}\n@media (max-width: 520px) {\n  .admin-summary { grid-template-columns: 1fr; }\n}\n\n/* v12 관리자 경매 날짜 표시 */\n.summary-chip.total {\n  background: rgba(31,31,31,.055);\n  border-color: rgba(31,31,31,.14);\n}\n.auction-date-summary {\n  background: rgba(255,255,255,.72);\n}\n.auction-date-cells {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 8px;\n}\n.auction-date-chip, .auction-date-pill {\n  display: inline-flex;\n  align-items: center;\n  border-radius: 999px;\n  border: 1px solid var(--line);\n  font-weight: 900;\n  cursor: help;\n}\n.auction-date-chip {\n  flex-direction: column;\n  align-items: flex-start;\n  gap: 2px;\n  padding: 9px 11px;\n  min-width: 150px;\n  background: var(--card);\n}\n.auction-date-chip small,\n.auction-date-chip em {\n  font-style: normal;\n  font-size: 11px;\n  line-height: 1.2;\n}\n.auction-date-chip small { color: var(--muted); font-weight: 900; }\n.auction-date-chip em { color: var(--ink); opacity: .78; }\n.auction-date-main { font-size: .95rem; }\n.auction-date-pill {\n  padding: 5px 9px;\n  font-size: 12px;\n  margin-right: 8px;\n}\n.auction-date-chip.live, .auction-date-pill.live {\n  background: rgba(37, 113, 95, .11);\n  border-color: rgba(37, 113, 95, .38);\n  color: #1f604f;\n}\n.auction-date-chip.band, .auction-date-pill.band {\n  background: rgba(64, 91, 151, .10);\n  border-color: rgba(64, 91, 151, .34);\n  color: #314a87;\n}\n.auction-date-chip.mixed, .auction-date-pill.mixed {\n  background: linear-gradient(135deg, rgba(37,113,95,.12), rgba(64,91,151,.12));\n  border-color: rgba(185,155,107,.45);\n  color: #4b443a;\n}\n.auction-date-chip.unknown, .auction-date-pill.unknown {\n  background: rgba(179, 58, 58, .08);\n  border-color: rgba(179, 58, 58, .22);\n  color: #8a3333;\n}\n.item-auction-line {\n  display: flex;\n  align-items: center;\n  gap: 0;\n  flex-wrap: wrap;\n  margin: 4px 0 5px;\n}\n\n@media (max-width: 520px) {\n  .auction-date-chip { width: 100%; }\n}\n\n\n/* v13 관리자 전체 신청 현황 */\n.overall-summary {\n  margin: 16px 0 18px;\n  border: 1px solid rgba(31,31,31,.12);\n  border-radius: 22px;\n  padding: 18px;\n  background: linear-gradient(135deg, rgba(31,31,31,.055), rgba(236,228,216,.44));\n}\n.overall-summary-head {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 12px;\n  margin-bottom: 12px;\n}\n.overall-summary-head h3 { margin: 2px 0 0; font-size: 1.2rem; }\n.overall-filter-label {\n  display: inline-flex;\n  align-items: center;\n  border-radius: 999px;\n  padding: 8px 11px;\n  background: #fff;\n  border: 1px solid var(--line);\n  color: var(--muted);\n  font-size: 12px;\n  font-weight: 900;\n}\n.overall-summary-grid {\n  display: grid;\n  grid-template-columns: repeat(6, minmax(0, 1fr));\n  gap: 10px;\n}\n.overall-stat, .overall-pending {\n  border: 1px solid var(--line);\n  border-radius: 16px;\n  background: rgba(255,255,255,.76);\n  padding: 14px;\n}\n.overall-stat span, .overall-pending span {\n  display: block;\n  color: var(--muted);\n  font-size: 12px;\n  font-weight: 900;\n  margin-bottom: 6px;\n}\n.overall-stat strong {\n  display: block;\n  font-size: 1.45rem;\n  font-weight: 950;\n  letter-spacing: -.04em;\n}\n.overall-stat.total {\n  background: #1f1f1f;\n  color: #fff;\n  border-color: #1f1f1f;\n}\n.overall-stat.total span { color: rgba(255,255,255,.7); }\n\n.overall-stat.payment-total {\n  background: #2c3b32;\n  border-color: #2c3b32;\n}\n\n.overall-stat.ok, .overall-pending.ok {\n  background: rgba(37,113,95,.08);\n  border-color: rgba(37,113,95,.24);\n}\n.overall-stat.warn, .overall-pending.warn {\n  background: rgba(185,155,107,.12);\n  border-color: rgba(185,155,107,.34);\n}\n.overall-pending { margin-top: 10px; }\n.overall-pending strong {\n  display: block;\n  line-height: 1.55;\n  font-size: .96rem;\n}\n@media (max-width: 860px) {\n  .overall-summary-head { flex-direction: column; align-items: flex-start; }\n  .overall-summary-grid { grid-template-columns: 1fr 1fr; }\n}\n@media (max-width: 520px) {\n  .overall-summary-grid { grid-template-columns: 1fr; }\n}\n\n/* v18 관리자 목록 정리 / 요청사항 수정 / 자동 반영 표시 */\n.admin-bidder {\n  position: relative;\n  overflow: hidden;\n}\n.admin-bidder.recently-added {\n  border-color: rgba(37,113,95,.52);\n  box-shadow: 0 0 0 4px rgba(37,113,95,.10), 0 18px 54px rgba(31,31,31,.07);\n}\n.admin-bidder.recently-added::before {\n  content: \"방금 등록됨\";\n  position: absolute;\n  right: 18px;\n  top: 16px;\n  padding: 5px 9px;\n  border-radius: 999px;\n  background: rgba(37,113,95,.12);\n  color: var(--ok);\n  font-size: 11px;\n  font-weight: 900;\n}\n.admin-bidder-head {\n  padding-bottom: 12px;\n  border-bottom: 1px solid rgba(226,215,202,.78);\n}\n.admin-bidder-head .admin-meta {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 6px;\n  margin: 6px 0 0;\n}\n.admin-bidder-head .admin-meta span {\n  display: inline-flex;\n  align-items: center;\n  min-height: 26px;\n  padding: 4px 9px;\n  border: 1px solid var(--line);\n  border-radius: 999px;\n  background: rgba(255,255,255,.78);\n  font-size: 12px;\n  font-weight: 800;\n}\n.admin-summary-clean {\n  grid-template-columns: 1.05fr 1.25fr .9fr;\n}\n.admin-summary-clean .summary-chip {\n  min-height: 74px;\n}\n.clean-item-card {\n  background: linear-gradient(135deg, #fff, rgba(255,253,248,.82));\n  border-color: rgba(226,215,202,.94);\n  box-shadow: 0 6px 20px rgba(31,31,31,.035);\n}\n.clean-item-card.recently-saved {\n  border-color: rgba(37,113,95,.44);\n  box-shadow: 0 0 0 3px rgba(37,113,95,.10);\n}\n.clean-item-head {\n  align-items: center;\n}\n.item-clean-main {\n  min-width: 0;\n}\n.item-title-row {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  flex-wrap: wrap;\n}\n.status-mini {\n  display: inline-flex;\n  align-items: center;\n  padding: 4px 8px;\n  border-radius: 999px;\n  font-size: 11px;\n  font-weight: 900;\n  border: 1px solid var(--line);\n  background: rgba(236,228,216,.44);\n}\n.status-mini.ok {\n  background: rgba(37,113,95,.10);\n  border-color: rgba(37,113,95,.26);\n  color: var(--ok);\n}\n.status-mini.warn {\n  background: rgba(185,155,107,.13);\n  border-color: rgba(185,155,107,.34);\n  color: #8a6632;\n}\n.status-mini.normal {\n  background: rgba(64,91,151,.09);\n  border-color: rgba(64,91,151,.24);\n  color: #314a87;\n}\n.clean-info-line {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 6px;\n  margin-top: 7px;\n}\n.clean-info-line span {\n  display: inline-flex;\n  align-items: center;\n  border: 1px solid var(--line);\n  background: rgba(255,255,255,.82);\n  border-radius: 999px;\n  padding: 4px 8px;\n  font-size: 12px;\n  font-weight: 800;\n  color: var(--muted);\n}\n.clean-info-line .memo-preview {\n  max-width: 360px;\n  color: var(--ink);\n  background: rgba(185,155,107,.10);\n  border-color: rgba(185,155,107,.28);\n}\n.item-edit-details summary {\n  display: inline-flex;\n  align-items: center;\n  gap: 8px;\n  padding: 8px 12px;\n  border-radius: 999px;\n  background: rgba(236,228,216,.48);\n  border: 1px solid var(--line);\n}\n.item-edit-details[open] summary {\n  background: rgba(31,31,31,.06);\n}\n@media (max-width: 860px) {\n  .admin-summary-clean { grid-template-columns: 1fr; }\n  .admin-bidder.recently-added::before { position: static; display: inline-flex; margin-bottom: 10px; }\n  .clean-item-head { align-items: flex-start; }\n}\n\n\n/* v19 기본설정 정리 + 관리자 목록 한글 줄바꿈 개선 */\n.admin-list, .admin-bidder, .admin-bidder * {\n  word-break: keep-all;\n}\n.admin-bidder h3,\n.item-title-row strong,\n.clean-info-line span,\n.admin-bidder-head .admin-meta span,\n.summary-chip strong,\n.summary-wide strong,\n.auction-date-chip,\n.auction-date-pill {\n  overflow-wrap: anywhere;\n  line-height: 1.35;\n}\n.admin-bidder-head .admin-meta span,\n.status-mini,\n.auction-date-pill {\n  white-space: nowrap;\n}\n.admin-summary-clean {\n  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));\n}\n.clean-item-head {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr) auto;\n  align-items: start;\n}\n.item-clean-main, .admin-bidder-head > div {\n  min-width: 0;\n}\n.clean-info-line .memo-preview {\n  max-width: min(100%, 520px);\n}\n@media (max-width: 760px) {\n  .clean-item-head { grid-template-columns: 1fr; }\n  .admin-bidder-head .admin-meta span, .status-mini, .auction-date-pill { white-space: normal; }\n}\n\n\n/* v20 관리자 낙찰자 목록 상단 세로 글씨 수정 */\n.list-card {\n  overflow: visible;\n}\n\n.list-toolbar {\n  display: grid !important;\n  grid-template-columns: 1fr !important;\n  align-items: stretch !important;\n  gap: 14px !important;\n}\n\n.list-toolbar > div:first-child {\n  width: 100% !important;\n  min-width: 0 !important;\n  max-width: none !important;\n}\n\n.list-toolbar h2,\n.list-toolbar p,\n.list-toolbar .muted {\n  writing-mode: horizontal-tb !important;\n  text-orientation: mixed !important;\n  white-space: normal !important;\n  word-break: keep-all !important;\n  overflow-wrap: normal !important;\n  line-height: 1.55 !important;\n  max-width: none !important;\n}\n\n.list-toolbar h2 {\n  display: block !important;\n  min-width: 120px !important;\n  margin-bottom: 6px !important;\n  letter-spacing: -0.03em !important;\n}\n\n.toolbar-actions {\n  width: 100% !important;\n  display: grid !important;\n  grid-template-columns: minmax(220px, 1.25fr) minmax(160px, .8fr) minmax(360px, 1.45fr) auto auto !important;\n  gap: 10px !important;\n  align-items: center !important;\n}\n\n.toolbar-actions input,\n.toolbar-actions button {\n  width: 100% !important;\n  min-width: 0 !important;\n}\n\n.date-range-filter {\n  width: 100% !important;\n  display: grid !important;\n  grid-template-columns: minmax(145px, 1fr) auto minmax(145px, 1fr) !important;\n  align-items: center !important;\n  gap: 8px !important;\n}\n\n.date-range-filter span {\n  text-align: center !important;\n  white-space: nowrap !important;\n}\n\n.auction-filter-head {\n  display: flex !important;\n  flex-wrap: wrap !important;\n  align-items: center !important;\n}\n\n.auction-filter-head strong,\n.auction-filter-head span {\n  writing-mode: horizontal-tb !important;\n  white-space: normal !important;\n  word-break: keep-all !important;\n}\n\n@media (max-width: 1120px) {\n  .toolbar-actions {\n    grid-template-columns: 1fr 1fr !important;\n  }\n  .toolbar-actions button {\n    min-height: 48px !important;\n  }\n}\n\n@media (max-width: 680px) {\n  .toolbar-actions {\n    grid-template-columns: 1fr !important;\n  }\n  .date-range-filter {\n    grid-template-columns: 1fr !important;\n  }\n  .date-range-filter span {\n    display: none !important;\n  }\n}\n\n\n/* v21 전체 신청 현황 클릭 이동 + 손님 현황 접기/펼치기 */\n.summary-jump-list {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 7px;\n  margin-top: 4px;\n}\n\n.summary-jump {\n  display: inline-flex;\n  align-items: center;\n  max-width: 100%;\n  border: 1px solid rgba(226,215,202,.95);\n  background: #fff;\n  color: var(--ink);\n  border-radius: 999px;\n  padding: 7px 10px;\n  font: inherit;\n  font-size: 12px;\n  font-weight: 900;\n  line-height: 1.25;\n  cursor: pointer;\n  white-space: normal;\n  word-break: keep-all;\n  text-align: left;\n}\n\n.summary-jump:hover {\n  transform: translateY(-1px);\n  box-shadow: 0 8px 20px rgba(31,31,31,.08);\n}\n\n.summary-more {\n  display: inline-flex;\n  align-items: center;\n  padding: 7px 10px;\n  border-radius: 999px;\n  background: rgba(236,228,216,.62);\n  color: var(--muted);\n  font-size: 12px;\n  font-weight: 900;\n}\n\n.admin-items {\n  margin-top: 12px;\n}\n\n.admin-items.is-collapsed {\n  display: none !important;\n}\n\n.admin-head-actions {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 8px;\n  justify-content: flex-end;\n  align-items: center;\n}\n\n.jump-highlight {\n  animation: jumpHighlight 2.4s ease;\n  border-color: rgba(37,113,95,.72) !important;\n  box-shadow: 0 0 0 4px rgba(37,113,95,.16), 0 14px 36px rgba(31,31,31,.10) !important;\n}\n\n@keyframes jumpHighlight {\n  0% { transform: translateY(-2px); background: rgba(37,113,95,.12); }\n  55% { transform: translateY(0); background: rgba(37,113,95,.08); }\n  100% { background: #fff; }\n}\n\n@media (max-width: 760px) {\n  .admin-head-actions {\n    justify-content: flex-start;\n    width: 100%;\n  }\n  .admin-head-actions button {\n    flex: 1 1 auto;\n  }\n}\n\n\n/* v22 클릭 이동 시 다른 손님 현황 자동 닫힘 */\n.admin-items {\n  transition: opacity .16s ease;\n}\n\n\n/* v23 신청 페이지 관리자 링크 제거 + 클릭 이동 시 해당 개체만 열림 */\n.admin-item-editor .item-edit-details:not([open]) .item-edit-body {\n  display: none;\n}\n\n\n/* v30 CSV 업로드 */\n.version-badge {\n  display: inline-flex;\n  margin-top: 8px;\n  padding: 7px 11px;\n  border-radius: 999px;\n  background: rgba(37,113,95,.12);\n  color: var(--ok);\n  font-size: 12px;\n  font-weight: 900;\n}\n.csv-import-card {\n  margin: 22px 0;\n  border: 3px solid rgba(37,113,95,.45);\n  box-shadow: 0 0 0 5px rgba(37,113,95,.08), var(--shadow);\n  background: linear-gradient(135deg, #fffdf8, rgba(37,113,95,.07));\n}\n.csv-import-card .step {\n  width: 54px;\n  height: 54px;\n  font-size: 13px;\n  background: rgba(37,113,95,.14);\n  color: var(--ok);\n}\n.csv-import-card input[type=\"file\"] {\n  border: 2px dashed rgba(37,113,95,.35);\n  background: #fff;\n  cursor: pointer;\n}\n.csv-import-actions {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 10px;\n}\n.csv-import-actions button { min-width: 190px; }\n#csvImportJumpButton { background: linear-gradient(135deg, #25715f, #1e4f43); }\n@media (max-width: 760px) {\n  .csv-import-actions { display: grid; }\n  .csv-import-actions button { width: 100%; }\n}\n\n\n/* v31 CSV 업로드 최종 */\n.version-badge {\n  display: inline-flex;\n  margin: 8px 0 0;\n  padding: 6px 10px;\n  border-radius: 999px;\n  background: rgba(37,113,95,.12);\n  color: var(--ok);\n  font-size: 12px;\n  font-weight: 950;\n}\n.csv-upload-card.always-visible {\n  margin: 22px 0;\n  border: 3px solid rgba(37,113,95,.56);\n  box-shadow: 0 0 0 5px rgba(37,113,95,.09), 0 18px 54px rgba(31,31,31,.07);\n  background: linear-gradient(135deg, #fffdf8, rgba(37,113,95,.07));\n}\n.csv-upload-card.always-visible h2 {\n  font-size: 24px;\n}\n.csv-upload-card .step {\n  width: 52px;\n  height: 52px;\n  font-size: 13px;\n  background: rgba(37,113,95,.14);\n  color: var(--ok);\n}\n.csv-file-label input[type=\"file\"] {\n  border: 2px dashed rgba(37,113,95,.35);\n  background: #fff;\n  cursor: pointer;\n}\n.csv-upload-actions {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 10px;\n}\n.csv-upload-actions button {\n  min-width: 190px;\n}\n#csvUploadToolbarButton {\n  background: linear-gradient(135deg, #25715f, #1e4f43);\n}\n@media (max-width: 760px) {\n  .csv-upload-actions { display: grid; }\n  .csv-upload-actions button { width: 100%; }\n}\n"};

function sendPublicAsset(res, relativePath, contentType) {
  const normalized = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
  const filePath = path.join(PUBLIC_DIR, normalized);
  if (fs.existsSync(filePath)) {
    return res.type(contentType).sendFile(filePath);
  }
  const key = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  const embedded = EMBEDDED_PUBLIC[key];
  if (embedded !== undefined) {
    console.log(`내장 파일로 응답: ${key}`);
    return res.type(contentType).send(embedded);
  }
  return res.status(404).type('text/plain').send(`${relativePath} 파일을 찾지 못했습니다.`);
}

app.use(express.static(PUBLIC_DIR));

app.get('/assets/style.css', (req, res) => sendPublicAsset(res, '/assets/style.css', 'text/css; charset=utf-8'));
app.get('/assets/admin.js', (req, res) => sendPublicAsset(res, '/assets/admin.js', 'application/javascript; charset=utf-8'));
app.get('/assets/app.js', (req, res) => sendPublicAsset(res, '/assets/app.js', 'application/javascript; charset=utf-8'));
app.get('/', (req, res) => sendPublicAsset(res, '/index.html', 'text/html; charset=utf-8'));
app.get('/index.html', (req, res) => sendPublicAsset(res, '/index.html', 'text/html; charset=utf-8'));
app.get('/admin.html', (req, res) => sendPublicAsset(res, '/admin.html', 'text/html; charset=utf-8'));

function readDb() {
  if (!fs.existsSync(DB_PATH)) return { settings: {}, bidders: [] };
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function writeDb(db) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

function normalizePhone(value = '') { return String(value).replace(/\D/g, ''); }
function makeId(prefix) { return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`; }

function requireAdmin(req, res, next) {
  const password = req.headers['x-admin-password'];
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ message: '관리자 비밀번호가 올바르지 않습니다.' });
  next();
}


const DEFAULT_DODOSI_STATIONS_TEXT = "경기A|렙타일갤러리-화성 봉담|경기도 화성시 융건로 76-15|30000\n전라|크레파스-목포|전라남도 무안군 삼향읍 남악5로72번길 18-1|55000\n경상B|팬크레-기장|부산광역시 기장군 정관읍 구연방곡로 43|60000\n충청B|딥리딩-충주|충청북도 충주시 금제9길 4|45000\n경기B|크레리즘[검단]|인천광역시 서구 이음5로 34 제일프라자|35000\n서울|티그리스게코[강동]|서울특별시 강동구 상암로 8-1|35000\n서울|다이노마켓[송파]-송파|서울특별시 송파구 거마로9길 18-8|35000\n경기B|아임룻-광명|경기도 광명시 범안로 1040|35000\n서울|게코스리퍼블릭-마포|서울특별시 마포구 월드컵로14길 50-13|35000\n경상B|와우펫앤쥬[명지]-부산명지|부산광역시 강서구 명지국제6로 21 도형건설|60000\n경상B|푸딩크레-동래|부산광역시 동래구 아시아드대로 205|60000\n경상A|번식왕의 브리딩센터-진주|경상남도 진주시 남강로 709-1|55000\n경상B|크레용[양산]-양산|경상남도 양산시 물금읍 황산로 356|60000\n경상A|샤인크레-김천|경상북도 김천시 시민로 50|55000\n전라|홍이네도마뱀-전주우아|전북특별자치도 전주시 덕진구 도당산로 47|55000\n충청B|도마바얌-홍성|충청남도 홍성군 홍북읍 홍학로 124 한울마을 LH2단지 1BL|45000\n충청B|크레하니-예산|충청남도 예산군 삽교읍 의향로 315 내포 에드가프라자 3차|45000\n충청B|리치맨파충류샵-서산|충청남도 서산시 율지18로 34|45000\n충청B|디어렙[공주]-공주|충청남도 공주시 무령로 599-25|45000\n충청A|몬스터펫-천안신방|충청남도 천안시 동남구 통정9로 20|40000\n충청B|디어렙[청주]-청주용암|충청북도 청주시 상당구 중고개로125번길 7|45000\n경기C|아토리-하남|경기도 하남시 대청로 33 현대 베스코아|35000\n경기A|깜크-안양|경기도 안양시 동안구 동편로39번길 17-6|30000\n경기A|우리집도마뱀-안산|경기도 안산시 상록구 광덕산안길 12|30000\n경기B|더행복한크레샵-시흥|경기도 시흥시 장현능곡로 9 장현프라자|35000\n경기C|파충류샵 스탈릿-오산|경기도 오산시 수목원로468번길 28|35000\n경기C|챔챔크레-용인동백|경기도 용인시 기흥구 동백중앙로 237 쥬네브스타월드|35000\n경기C|코지렙타일-분당서현|경기도 성남시 분당구 분당로53번길 15 산호트윈스|35000\n경기B|마브렙타일-일산|경기도 고양시 일산동구 중앙로1261번길 59 로얄프라자3|35000\n경기B|트리에코-연수|인천광역시 연수구 먼우금로 19 동남아파트|35000\n경기B|크레스탈[서창]-남동|인천광역시 남동구 서창남순환로216번길 36 리치타워|35000\n서울|그린포레스트-서초|서울특별시 서초구 청룡마을길 47|35000\n서울|네스트렙타일-서대문|서울특별시 서대문구 통일로39가길 1|35000\n서울|타란센터-강북|서울특별시 강북구 한천로140길 59 별하우스|35000\n충청A|낭게코(천안)-천안|충청남도 천안시 서북구 두정로 209 두정빌딩|40000\n경기C|보스게코(여주)-여주|경기도 여주시 현암2길 68-1|35000\n서울|베누스게코-성동|서울특별시 광진구 동일로 34|35000\n경상B|창원-크레라핀|경상남도 창원시 성산구 외동반림로74번길 39|60000\n경기B|인천[부평]-새벽피딩|인천광역시 부평구 동수로 49|35000";
const DEFAULT_SETTINGS = {
  shopName: '렙타일갤러리',
  subtitle: '낙찰 결제 · 수령 신청',
  shopAddress: '경기도 화성시 병점구 효행로 437-10 2층',
  bankInfo: '토스뱅크 1000-0710-0707',
  notice: '낙찰 개체별로 결제/수령 신청을 진행해 주세요. 도도시 배송비는 최종 결제금액에 포함되지 않으며 담당자 확인 후 별도 안내됩니다.',
  memoRequestLabel: '메모 또는 요청사항',
  memoRequestPlaceholder: '방문 가능 시간, 도도시 요청사항, 결제 관련 메모',
  smsPhone: process.env.SMS_PHONE || '01044456632',
  storePickupDiscountRate: 5,
  transferDiscountRate: 5,
  fiddleFeeRate: 3.3,
  cardFiddleFeeRate: 3.3,
  userLookupDays: 7,
  dodosiDepositShop: '렙타일갤러리-화성 봉담',
  dodosiDepositRegion: '경기A',
  dodosiDepositAddress: '경기도 화성시 융건로 76-15'
};

function parseDodosiStations(text = '') {
  return String(text || '').split(/\r?\n/).map((line, index) => {
    const raw = line.trim();
    if (!raw || raw.startsWith('#')) return null;
    const [region = '', name = '', address = '', fee = '0'] = raw.split('|').map((part) => part.trim());
    if (!name) return null;
    const baseId = `${region}-${name}-${address}-${index}`.replace(/[^a-zA-Z0-9가-힣]+/g, '-').replace(/^-|-$/g, '');
    return {
      id: baseId || `station-${index}`,
      region,
      name,
      address,
      fee: Number(String(fee).replace(/\D/g, '') || 0)
    };
  }).filter(Boolean);
}

function getSettings(db = {}) {
  const current = db.settings || {};
  const dodosiStationsText = String(current.dodosiStationsText || DEFAULT_DODOSI_STATIONS_TEXT);
  return {
    ...DEFAULT_SETTINGS,
    ...current,
    fiddleFeeRate: Number(current.fiddleFeeRate ?? current.cardFiddleFeeRate ?? DEFAULT_SETTINGS.fiddleFeeRate),
    cardFiddleFeeRate: Number(current.fiddleFeeRate ?? current.cardFiddleFeeRate ?? DEFAULT_SETTINGS.cardFiddleFeeRate),
    userLookupDays: Number(current.userLookupDays ?? DEFAULT_SETTINGS.userLookupDays),
    smsPhone: String(current.smsPhone || DEFAULT_SETTINGS.smsPhone).replace(/[^0-9+]/g, ''),
    dodosiStationsText,
    dodosiStations: parseDodosiStations(dodosiStationsText)
  };
}

function isUserLookupOpen(bidder, settings = {}) {
  const days = Number(settings.userLookupDays ?? 7);
  if (!days || days < 1) return true;
  const created = new Date(bidder.createdAt || bidder.shipping?.updatedAt || Date.now());
  if (Number.isNaN(created.getTime())) return true;
  return Date.now() - created.getTime() <= days * 24 * 60 * 60 * 1000;
}

function getSelectedItemIds(bidder) {
  const allIds = (bidder.items || []).map((item) => item.id);
  const saved = Array.isArray(bidder.shipping?.selectedItemIds) ? bidder.shipping.selectedItemIds.filter((id) => allIds.includes(id)) : [];
  return saved.length ? saved : allIds;
}

function moneyRound(value) { return Math.max(0, Math.round(Number(value || 0))); }

function normalizePaymentMethod(method) {
  if (method === '카드/피들') return '피들';
  if (['이체', '카드', '피들'].includes(method)) return method;
  return '이체';
}


function paymentMultiplier(method, settings = {}) {
  const transferDiscountRate = Number(settings.transferDiscountRate ?? 5) / 100;
  const fiddleFeeRate = Number(settings.fiddleFeeRate ?? settings.cardFiddleFeeRate ?? 3.3) / 100;
  const normalized = normalizePaymentMethod(method);
  if (normalized === '피들') return 1 + fiddleFeeRate;
  if (normalized === '이체') return 1 - transferDiscountRate;
  return 1;
}

function calculateSingleItemApplication(item = {}, application = {}, settings = {}) {
  const price = Number(item.price || 0);
  const paymentMethod = normalizePaymentMethod(application.paymentMethod || application.payments?.[item.id] || '이체');
  const afterPayment = price * paymentMultiplier(paymentMethod, settings);
  const pickupDiscountRate = Number(settings.storePickupDiscountRate ?? 5) / 100;
  const pickupDiscount = application.method === '매장 방문수령' ? price * pickupDiscountRate : 0;
  const finalTotal = moneyRound(afterPayment - pickupDiscount);
  return {
    itemId: item.id,
    selected: true,
    price: moneyRound(price),
    paymentMethod,
    afterPayment: moneyRound(afterPayment),
    pickupDiscount: moneyRound(pickupDiscount),
    payable: finalTotal,
    finalTotal
  };
}

function getItemApplication(bidder = {}, itemId) {
  return bidder.itemApplications && bidder.itemApplications[itemId] ? bidder.itemApplications[itemId] : null;
}

function calculatePaymentSummary(bidder, settings = {}) {
  const itemApplications = bidder.itemApplications || {};
  const hasItemApplications = Object.keys(itemApplications).length > 0;

  if (hasItemApplications) {
    let itemTotal = 0;
    let paymentAdjustedTotal = 0;
    let pickupDiscountTotal = 0;
    let finalTotal = 0;
    const itemBreakdown = [];
    const selectedItemIds = [];

    (bidder.items || []).forEach((item) => {
      const application = itemApplications[item.id];
      if (!application) {
        itemBreakdown.push({ itemId: item.id, selected: false, price: moneyRound(item.price || 0), paymentMethod: normalizePaymentMethod((bidder.payments || {})[item.id] || '이체'), afterPayment: 0, pickupDiscount: 0, payable: 0, status: '미신청' });
        return;
      }
      const summary = calculateSingleItemApplication(item, application, settings);
      itemTotal += summary.price;
      paymentAdjustedTotal += summary.afterPayment;
      pickupDiscountTotal += summary.pickupDiscount;
      finalTotal += summary.finalTotal;
      selectedItemIds.push(item.id);
      itemBreakdown.push({ ...summary, status: application.status || '신청완료', method: application.method || '' });
    });

    return {
      selectedItemIds,
      itemTotal: moneyRound(itemTotal),
      paymentAdjustedTotal: moneyRound(paymentAdjustedTotal),
      pickupDiscountTotal: moneyRound(pickupDiscountTotal),
      dodosiFee: 0,
      finalTotal: moneyRound(finalTotal),
      itemBreakdown
    };
  }

  const pickupDiscountRate = Number(settings.storePickupDiscountRate ?? 5) / 100;
  const method = bidder.shipping?.method || '';
  const payments = bidder.payments || bidder.shipping?.payments || {};
  const selectedItemIds = getSelectedItemIds(bidder);
  const selectedSet = new Set(selectedItemIds);
  const itemBreakdown = [];
  let itemTotal = 0;
  let paymentAdjustedTotal = 0;
  let pickupDiscountTotal = 0;
  let finalTotal = 0;

  (bidder.items || []).forEach((item) => {
    const selected = selectedSet.has(item.id);
    const price = Number(item.price || 0);
    const paymentMethod = normalizePaymentMethod(payments[item.id] || '이체');
    const afterPayment = selected ? price * paymentMultiplier(paymentMethod, settings) : 0;
    const pickupDiscount = selected && method === '매장 방문수령' ? price * pickupDiscountRate : 0;
    const payable = selected ? moneyRound(afterPayment - pickupDiscount) : 0;
    if (selected) {
      itemTotal += price;
      paymentAdjustedTotal += afterPayment;
      pickupDiscountTotal += pickupDiscount;
      finalTotal += payable;
    }
    itemBreakdown.push({
      itemId: item.id,
      selected,
      price: moneyRound(price),
      paymentMethod,
      afterPayment: moneyRound(afterPayment),
      pickupDiscount: moneyRound(pickupDiscount),
      payable
    });
  });

  return {
    selectedItemIds,
    itemTotal: moneyRound(itemTotal),
    paymentAdjustedTotal: moneyRound(paymentAdjustedTotal),
    pickupDiscountTotal: moneyRound(pickupDiscountTotal),
    dodosiFee: 0,
    finalTotal: moneyRound(finalTotal),
    itemBreakdown
  };
}

function bidderTotals(bidder, settings = {}) {
  return calculatePaymentSummary(bidder, settings);
}

app.get('/api/settings', (req, res) => {
  const db = readDb();
  res.json(getSettings(db));
});

app.put('/api/settings', requireAdmin, (req, res) => {
  const db = readDb();
  const current = getSettings(db);
  const dodosiStationsText = req.body.dodosiStationsText ?? current.dodosiStationsText ?? DEFAULT_DODOSI_STATIONS_TEXT;
  db.settings = {
    ...current,
    shopName: req.body.shopName ?? current.shopName,
    subtitle: req.body.subtitle ?? current.subtitle,
    shopAddress: req.body.shopAddress ?? current.shopAddress,
    bankInfo: req.body.bankInfo ?? current.bankInfo,
    memoRequestLabel: req.body.memoRequestLabel ?? current.memoRequestLabel ?? '메모 또는 요청사항',
    memoRequestPlaceholder: req.body.memoRequestPlaceholder ?? current.memoRequestPlaceholder ?? '방문 가능 시간, 도도시 요청사항, 결제 관련 메모',
    smsPhone: req.body.smsPhone ?? current.smsPhone ?? '',
    storePickupDiscountRate: Number(req.body.storePickupDiscountRate ?? current.storePickupDiscountRate ?? 5),
    transferDiscountRate: Number(req.body.transferDiscountRate ?? current.transferDiscountRate ?? 5),
    fiddleFeeRate: Number(req.body.fiddleFeeRate ?? req.body.cardFiddleFeeRate ?? current.fiddleFeeRate ?? current.cardFiddleFeeRate ?? 3.3),
    cardFiddleFeeRate: Number(req.body.fiddleFeeRate ?? req.body.cardFiddleFeeRate ?? current.fiddleFeeRate ?? current.cardFiddleFeeRate ?? 3.3),
    userLookupDays: Number(req.body.userLookupDays ?? current.userLookupDays ?? 7),
    dodosiDepositShop: current.dodosiDepositShop || '렙타일갤러리-화성 봉담',
    dodosiDepositRegion: current.dodosiDepositRegion || '경기A',
    dodosiDepositAddress: current.dodosiDepositAddress || '경기도 화성시 융건로 76-15',
    dodosiStationsText,
    dodosiStations: parseDodosiStations(dodosiStationsText),
    notice: req.body.notice ?? current.notice
  };
  writeDb(db);
  res.json(getSettings(db));
});

app.get('/api/bidders/search', (req, res) => {
  const name = String(req.query.name || '').trim();
  const phone = normalizePhone(req.query.phone || '');
  if (!name || !phone) return res.status(400).json({ message: '성함과 연락처를 입력해 주세요.' });

  const db = readDb();
  const settings = getSettings(db);
  const matchedAll = (db.bidders || []).filter((bidder) => {
    const bidderPhone = normalizePhone(bidder.phone);
    return bidder.name.trim() === name && (bidderPhone.endsWith(phone) || bidderPhone === phone);
  });
  const matches = matchedAll
    .filter((bidder) => isUserLookupOpen(bidder, settings))
    .map((bidder) => ({ ...bidder, totals: bidderTotals(bidder, settings) }));

  if (!matches.length && matchedAll.length) {
    return res.status(410).json({ message: `신청 페이지 조회 가능 기간(${settings.userLookupDays || 7}일)이 지났습니다. 관리자 페이지에서는 계속 확인할 수 있습니다.` });
  }
  res.json({ bidders: matches });
});


app.post('/api/bidders/:bidderId/items/:itemId/application', (req, res) => {
  const db = readDb();
  const settings = getSettings(db);
  const bidder = (db.bidders || []).find((entry) => entry.id === req.params.bidderId);
  if (!bidder) return res.status(404).json({ message: '낙찰자를 찾을 수 없습니다.' });
  if (!isUserLookupOpen(bidder, settings)) return res.status(410).json({ message: `신청 페이지 조회 가능 기간(${settings.userLookupDays || 7}일)이 지났습니다. 관리자 페이지에서는 계속 확인할 수 있습니다.` });

  const item = (bidder.items || []).find((entry) => entry.id === req.params.itemId);
  if (!item) return res.status(404).json({ message: '낙찰 개체를 찾을 수 없습니다.' });

  const method = String(req.body.method || '').trim();
  if (!['매장 방문수령', '도도시'].includes(method)) return res.status(400).json({ message: '수령 방법은 매장 방문수령 또는 도도시만 선택 가능합니다.' });
  if (method === '매장 방문수령' && !req.body.pickupDate) return res.status(400).json({ message: '방문수령 희망 날짜를 선택해 주세요.' });
  if (method === '도도시' && !String(req.body.dodosiTo || '').trim()) return res.status(400).json({ message: '도도시 받는 곳 정거샵명을 입력해 주세요.' });

  const rawPaymentMethod = String(req.body.paymentMethod || '').trim();
  if (!['이체', '카드', '피들', '카드/피들'].includes(rawPaymentMethod)) return res.status(400).json({ message: '결제 방식을 선택해 주세요.' });
  const paymentMethod = normalizePaymentMethod(rawPaymentMethod);

  bidder.itemApplications = bidder.itemApplications || {};
  bidder.payments = bidder.payments || {};
  bidder.payments[item.id] = paymentMethod;

  const application = {
    itemId: item.id,
    method,
    paymentMethod,
    pickupDate: String(req.body.pickupDate || '').trim(),
    dodosiFrom: String(req.body.dodosiFrom || settings.dodosiDepositShop || '렙타일갤러리-화성 봉담').trim(),
    dodosiStationId: '',
    dodosiTo: method === '도도시' ? String(req.body.dodosiTo || '').trim() : '',
    dodosiRegion: '',
    dodosiAddress: '',
    dodosiFee: 0,
    memo: String(req.body.memo || '').trim(),
    status: '신청완료',
    updatedAt: new Date().toISOString()
  };
  application.paymentSummary = calculateSingleItemApplication(item, application, settings);
  bidder.itemApplications[item.id] = application;

  bidder.shipping = {
    ...(bidder.shipping || {}),
    status: '신청완료',
    updatedAt: application.updatedAt
  };

  writeDb(db);
  res.json({
    bidder: { ...bidder, totals: bidderTotals(bidder, settings) },
    item,
    application,
    smsPhone: settings.smsPhone || ''
  });
});

app.post('/api/bidders/:id/shipping', (req, res) => {
  const db = readDb();
  const bidder = (db.bidders || []).find((item) => item.id === req.params.id);
  if (!bidder) return res.status(404).json({ message: '낙찰자를 찾을 수 없습니다.' });

  const method = String(req.body.method || '').trim();
  if (!method) return res.status(400).json({ message: '수령 방법을 선택해 주세요.' });
  if (!['매장 방문수령', '도도시'].includes(method)) return res.status(400).json({ message: '수령 방법은 매장 방문수령 또는 도도시만 선택 가능합니다.' });
  if (method === '매장 방문수령' && !req.body.pickupDate) return res.status(400).json({ message: '방문수령 희망 날짜를 선택해 주세요.' });
  if (method === '도도시' && !req.body.dodosiTo) return res.status(400).json({ message: '도도시 받는 곳을 선택해 주세요.' });

  const validItemIds = (bidder.items || []).map((item) => item.id);
  const selectedItemIds = Array.isArray(req.body.selectedItemIds)
    ? req.body.selectedItemIds.filter((id) => validItemIds.includes(id))
    : validItemIds;
  if (!selectedItemIds.length) return res.status(400).json({ message: '신청할 낙찰 개체를 1개 이상 선택해 주세요.' });

  bidder.payments = Object.fromEntries(Object.entries(req.body.payments || bidder.payments || {}).map(([key, value]) => [key, normalizePaymentMethod(value)]));
  bidder.shipping = {
    ...(bidder.shipping || {}),
    selectedItemIds,
    method,
    pickupDate: String(req.body.pickupDate || '').trim(),
    dodosiFrom: String(req.body.dodosiFrom || '렙타일갤러리-화성 봉담').trim(),
    dodosiStationId: String(req.body.dodosiStationId || '').trim(),
    dodosiTo: String(req.body.dodosiTo || '').trim(),
    dodosiRegion: String(req.body.dodosiRegion || '').trim(),
    dodosiAddress: String(req.body.dodosiAddress || '').trim(),
    dodosiFee: Number(req.body.dodosiFee || 0),
    memo: String(req.body.memo || '').trim(),
    payments: bidder.payments,
    paymentSummary: req.body.paymentSummary || calculatePaymentSummary(bidder, getSettings(db)),
    status: '신청완료',
    updatedAt: new Date().toISOString()
  };
  bidder.shipping.paymentSummary = calculatePaymentSummary(bidder, getSettings(db));

  writeDb(db);
  res.json({ bidder: { ...bidder, totals: bidderTotals(bidder, getSettings(db)) } });
});

app.get('/api/admin/bidders', requireAdmin, (req, res) => {
  const db = readDb();
  const bidders = (db.bidders || []).map((bidder) => ({ ...bidder, totals: bidderTotals(bidder, getSettings(db)) }));
  res.json({ bidders, settings: getSettings(db) });
});

app.post('/api/admin/bidders', requireAdmin, (req, res) => {
  const { name, phone, vendor, auctionType, auctionDate, title, detail, price } = req.body;
  if (!name || !phone || !title) return res.status(400).json({ message: '성함, 연락처, 낙찰 개체명은 필수입니다.' });
  const db = readDb();
  const phoneDigits = normalizePhone(phone);
  let bidder = (db.bidders || []).find((item) => item.name.trim() === String(name).trim() && normalizePhone(item.phone) === phoneDigits);

  if (!bidder) {
    bidder = {
      id: makeId('b'),
      name: String(name).trim(),
      phone: phoneDigits,
      items: [],
      payments: {},
      itemApplications: {},
      shipping: { method: '', selectedItemIds: [], pickupDate: '', dodosiFrom: '렙타일갤러리-화성 봉담', dodosiStationId: '', dodosiTo: '', dodosiRegion: '', dodosiAddress: '', dodosiFee: 0, memo: '', status: '미신청', updatedAt: '' },
      createdAt: new Date().toISOString()
    };
    db.bidders.push(bidder);
  }

  const item = {
    id: makeId('i'),
    vendor: String(vendor || '렙타일갤러리').trim(),
    auctionType: ['라이브경매', '밴드경매'].includes(String(auctionType || '').trim()) ? String(auctionType).trim() : '',
    auctionDate: String(auctionDate || '').trim(),
    title: String(title).trim(),
    detail: String(detail || '').trim(),
    price: Number(price || 0)
  };
  bidder.items.push(item);
  bidder.payments = bidder.payments || {};
  bidder.payments[item.id] = '이체';

  writeDb(db);
  res.status(201).json({ bidder: { ...bidder, totals: bidderTotals(bidder, getSettings(db)) } });
});

app.patch('/api/admin/bidders/:id', requireAdmin, (req, res) => {
  const db = readDb();
  const bidder = (db.bidders || []).find((item) => item.id === req.params.id);
  if (!bidder) return res.status(404).json({ message: '낙찰자를 찾을 수 없습니다.' });

  if (req.body.name !== undefined) bidder.name = String(req.body.name).trim();
  if (req.body.phone !== undefined) bidder.phone = normalizePhone(req.body.phone);
  const validItemIds = (bidder.items || []).map((item) => item.id);
  const selectedItemIds = Array.isArray(req.body.selectedItemIds) ? req.body.selectedItemIds.filter((id) => validItemIds.includes(id)) : bidder.shipping?.selectedItemIds;

  bidder.shipping = {
    ...(bidder.shipping || {}),
    method: req.body.method ?? bidder.shipping?.method ?? '',
    selectedItemIds: selectedItemIds || bidder.shipping?.selectedItemIds || [],
    pickupDate: req.body.pickupDate ?? bidder.shipping?.pickupDate ?? '',
    dodosiTo: req.body.dodosiTo ?? bidder.shipping?.dodosiTo ?? '',
    dodosiAddress: req.body.dodosiAddress ?? bidder.shipping?.dodosiAddress ?? '',
    dodosiFee: Number(req.body.dodosiFee ?? bidder.shipping?.dodosiFee ?? 0),
    memo: req.body.memo ?? bidder.shipping?.memo ?? '',
    status: req.body.status ?? bidder.shipping?.status ?? '미신청',
    updatedAt: new Date().toISOString()
  };
  bidder.shipping.paymentSummary = calculatePaymentSummary(bidder, getSettings(db));

  writeDb(db);
  res.json({ bidder: { ...bidder, totals: bidderTotals(bidder, getSettings(db)) } });
});


app.patch('/api/admin/bidders/:bidderId/items/:itemId', requireAdmin, (req, res) => {
  const db = readDb();
  const settings = getSettings(db);
  const bidder = (db.bidders || []).find((entry) => entry.id === req.params.bidderId);
  if (!bidder) return res.status(404).json({ message: '낙찰자를 찾을 수 없습니다.' });
  const item = (bidder.items || []).find((entry) => entry.id === req.params.itemId);
  if (!item) return res.status(404).json({ message: '낙찰 개체를 찾을 수 없습니다.' });

  if (req.body.vendor !== undefined) item.vendor = String(req.body.vendor || '렙타일갤러리').trim();
  if (req.body.auctionType !== undefined) {
    const auctionType = String(req.body.auctionType || '').trim();
    item.auctionType = ['라이브경매', '밴드경매'].includes(auctionType) ? auctionType : '';
  }
  if (req.body.auctionDate !== undefined) item.auctionDate = String(req.body.auctionDate || '').trim();
  if (req.body.title !== undefined) item.title = String(req.body.title || '').trim();
  if (req.body.detail !== undefined) item.detail = String(req.body.detail || '').trim();
  if (req.body.price !== undefined) item.price = Number(req.body.price || 0);
  if (!item.title) return res.status(400).json({ message: '낙찰 개체명은 필수입니다.' });

  bidder.payments = bidder.payments || {};
  const requestedPaymentMethod = String(req.body.paymentMethod || '').trim();
  if (requestedPaymentMethod) {
    if (!['이체', '카드', '피들', '카드/피들'].includes(requestedPaymentMethod)) return res.status(400).json({ message: '결제 방식이 올바르지 않습니다.' });
    bidder.payments[item.id] = normalizePaymentMethod(requestedPaymentMethod);
  } else if (bidder.payments[item.id] === '카드/피들') {
    bidder.payments[item.id] = '피들';
  }

  const applicationKeys = ['method', 'status', 'pickupDate', 'dodosiTo', 'memo'];
  const hasApplicationInput = applicationKeys.some((key) => req.body[key] !== undefined) || requestedPaymentMethod;
  bidder.itemApplications = bidder.itemApplications || {};
  const current = bidder.itemApplications[item.id] || null;

  if (hasApplicationInput || current) {
    const method = String(req.body.method ?? current?.method ?? '').trim();
    const status = String(req.body.status ?? current?.status ?? '미신청').trim() || '미신청';
    const pickupDate = String(req.body.pickupDate ?? current?.pickupDate ?? '').trim();
    const dodosiTo = String(req.body.dodosiTo ?? current?.dodosiTo ?? '').trim();
    const dodosiAddress = '';
    const memo = String(req.body.memo ?? current?.memo ?? '').trim();
    const paymentMethod = normalizePaymentMethod(requestedPaymentMethod || current?.paymentMethod || bidder.payments[item.id] || '이체');

    if (method && !['매장 방문수령', '도도시'].includes(method)) return res.status(400).json({ message: '수령 방법은 매장 방문수령 또는 도도시만 선택 가능합니다.' });

    if (status === '미신청' && !method && !pickupDate && !dodosiTo && !memo) {
      delete bidder.itemApplications[item.id];
    } else {
      const application = {
        ...(current || {}),
        itemId: item.id,
        method,
        paymentMethod,
        pickupDate,
        dodosiFrom: String(current?.dodosiFrom || settings.dodosiDepositShop || '렙타일갤러리-화성 봉담').trim(),
        dodosiStationId: String(current?.dodosiStationId || '').trim(),
        dodosiTo,
        dodosiRegion: String(current?.dodosiRegion || '').trim(),
        dodosiAddress,
        dodosiFee: 0,
        memo,
        status,
        updatedAt: new Date().toISOString()
      };
      application.paymentSummary = calculateSingleItemApplication(item, application, settings);
      bidder.itemApplications[item.id] = application;
    }
  }

  bidder.shipping = {
    ...(bidder.shipping || {}),
    status: Object.keys(bidder.itemApplications || {}).length ? '신청완료' : (bidder.shipping?.status || '미신청'),
    updatedAt: new Date().toISOString()
  };
  bidder.shipping.paymentSummary = calculatePaymentSummary(bidder, settings);

  writeDb(db);
  res.json({ bidder: { ...bidder, totals: bidderTotals(bidder, settings) } });
});

app.delete('/api/admin/bidders/:bidderId/items/:itemId', requireAdmin, (req, res) => {
  const db = readDb();
  const bidder = (db.bidders || []).find((item) => item.id === req.params.bidderId);
  if (!bidder) return res.status(404).json({ message: '낙찰자를 찾을 수 없습니다.' });
  bidder.items = (bidder.items || []).filter((item) => item.id !== req.params.itemId);
  if (bidder.payments) delete bidder.payments[req.params.itemId];
  if (bidder.itemApplications) delete bidder.itemApplications[req.params.itemId];
  if (bidder.items.length === 0) db.bidders = db.bidders.filter((item) => item.id !== req.params.bidderId);
  writeDb(db);
  res.json({ ok: true });
});

app.delete('/api/admin/bidders/:bidderId', requireAdmin, (req, res) => {
  const db = readDb();
  db.bidders = (db.bidders || []).filter((item) => item.id !== req.params.bidderId);
  writeDb(db);
  res.json({ ok: true });
});


function parseCsvText(text = '') {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const src = String(text || '').replace(/^\ufeff/, '');

  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    const next = src[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      row.push(field);
      field = '';
      continue;
    }

    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i += 1;
      row.push(field);
      if (row.some((value) => String(value || '').trim() !== '')) rows.push(row);
      row = [];
      field = '';
      continue;
    }

    field += ch;
  }

  row.push(field);
  if (row.some((value) => String(value || '').trim() !== '')) rows.push(row);
  return rows;
}

function csvLookup(row, indexMap, names) {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(indexMap, name)) return String(row[indexMap[name]] ?? '').trim();
  }
  return '';
}

function csvNumber(value) {
  const cleaned = String(value || '').replace(/[^0-9.-]/g, '');
  return Number(cleaned || 0);
}

function newBlankBidder(name, phoneDigits) {
  return {
    id: makeId('b'),
    name,
    phone: phoneDigits,
    items: [],
    payments: {},
    itemApplications: {},
    shipping: { method: '', selectedItemIds: [], pickupDate: '', dodosiFrom: '렙타일갤러리-화성 봉담', dodosiStationId: '', dodosiTo: '', dodosiRegion: '', dodosiAddress: '', dodosiFee: 0, memo: '', status: '미신청', updatedAt: '' },
    createdAt: new Date().toISOString()
  };
}

function importCsvRows(db, csvText, mode = 'merge') {
  const rows = parseCsvText(csvText);
  if (rows.length < 2) throw new Error('CSV에 데이터가 없습니다. 첫 줄은 제목, 둘째 줄부터 데이터가 있어야 합니다.');

  const headers = rows[0].map((value) => String(value || '').replace(/^\ufeff/, '').trim());
  const indexMap = Object.fromEntries(headers.map((value, index) => [value, index]));
  const required = ['낙찰자명', '전화번호', '낙찰개체'];
  const missing = required.filter((name) => !Object.prototype.hasOwnProperty.call(indexMap, name));
  if (missing.length) throw new Error(`CSV 제목줄에 ${missing.join(', ')} 항목이 없습니다. 관리자 페이지의 CSV 다운로드 파일이나 빈 양식을 사용해 주세요.`);

  if (mode === 'replace') db.bidders = [];
  db.bidders = db.bidders || [];

  const touched = new Set();
  let itemCount = 0;
  let applicationCount = 0;
  let skippedCount = 0;
  const settings = getSettings(db);

  rows.slice(1).forEach((row) => {
    const name = csvLookup(row, indexMap, ['낙찰자명', '성함', '이름']);
    const phone = normalizePhone(csvLookup(row, indexMap, ['전화번호', '연락처', '휴대폰']));
    const title = csvLookup(row, indexMap, ['낙찰개체', '낙찰 개체', '개체명']);

    if (!name || !phone || !title) {
      skippedCount += 1;
      return;
    }

    let bidder = db.bidders.find((entry) => entry.name.trim() === name && normalizePhone(entry.phone) === phone);
    if (!bidder) {
      bidder = newBlankBidder(name, phone);
      db.bidders.push(bidder);
    }
    bidder.items = bidder.items || [];
    bidder.payments = bidder.payments || {};
    bidder.itemApplications = bidder.itemApplications || {};
    bidder.shipping = bidder.shipping || { status: '미신청' };
    touched.add(bidder.id);

    const auctionTypeRaw = csvLookup(row, indexMap, ['경매구분', '경매 구분']);
    const auctionType = ['라이브경매', '밴드경매'].includes(auctionTypeRaw) ? auctionTypeRaw : '';
    const auctionDate = csvLookup(row, indexMap, ['경매날짜', '경매 날짜']);
    const price = csvNumber(csvLookup(row, indexMap, ['낙찰원금', '낙찰 금액', '금액']));
    const detail = csvLookup(row, indexMap, ['개체정보', '개체 정보']);
    const vendor = csvLookup(row, indexMap, ['업체', '출품 업체']) || '렙타일갤러리';
    const paymentMethod = normalizePaymentMethod(csvLookup(row, indexMap, ['결제방식', '결제 방식']) || '이체');
    const method = csvLookup(row, indexMap, ['수령방법', '수령 방법']);
    const pickupDate = csvLookup(row, indexMap, ['방문수령날짜', '방문수령 날짜']);
    const dodosiFrom = csvLookup(row, indexMap, ['도도시 맡기는곳', '도도시 맡기는 곳']) || '렙타일갤러리-화성 봉담';
    const dodosiTo = csvLookup(row, indexMap, ['도도시 받는곳', '도도시 받는 곳']);
    const memo = csvLookup(row, indexMap, ['메모', '요청사항', '메모 또는 요청사항']);
    const status = csvLookup(row, indexMap, ['상태']) || '미신청';
    const updatedAt = csvLookup(row, indexMap, ['신청/수정일', '수정일', '신청일']) || new Date().toISOString();

    let item = bidder.items.find((entry) =>
      String(entry.title || '').trim() === title &&
      String(entry.auctionDate || '').trim() === auctionDate &&
      Number(entry.price || 0) === price
    );

    if (!item) {
      item = { id: makeId('i'), vendor, auctionType, auctionDate, title, detail, price };
      bidder.items.push(item);
    } else {
      item.vendor = vendor;
      item.auctionType = auctionType;
      item.auctionDate = auctionDate;
      item.title = title;
      item.detail = detail;
      item.price = price;
    }
    itemCount += 1;
    bidder.payments[item.id] = paymentMethod;

    const hasApplication = status !== '미신청' || method || pickupDate || dodosiTo || memo;
    if (hasApplication) {
      const application = {
        itemId: item.id,
        method,
        paymentMethod,
        pickupDate,
        dodosiFrom,
        dodosiStationId: '',
        dodosiTo,
        dodosiRegion: '',
        dodosiAddress: '',
        dodosiFee: 0,
        memo,
        status,
        updatedAt
      };
      application.paymentSummary = calculateSingleItemApplication(item, application, settings);
      bidder.itemApplications[item.id] = application;
      bidder.shipping = { ...(bidder.shipping || {}), status: '신청완료', updatedAt };
      applicationCount += 1;
    }
  });

  return { biddersImported: touched.size, itemsImported: itemCount, applicationsImported: applicationCount, skipped: skippedCount };
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}


app.post('/api/admin/import.csv', requireAdmin, (req, res) => {
  try {
    const csvText = String(req.body.csvText || '');
    const mode = req.body.mode === 'replace' ? 'replace' : 'merge';
    if (!csvText.trim()) return res.status(400).json({ message: 'CSV 파일 내용이 비어 있습니다.' });

    const db = readDb();
    const result = importCsvRows(db, csvText, mode);
    writeDb(db);
    res.json({
      ok: true,
      mode,
      ...result,
      bidders: (db.bidders || []).map((bidder) => ({ ...bidder, totals: bidderTotals(bidder, getSettings(db)) })),
      settings: getSettings(db)
    });
  } catch (error) {
    res.status(400).json({ message: error.message || 'CSV 업로드에 실패했습니다.' });
  }
});

app.get('/api/admin/export.csv', requireAdmin, (req, res) => {
  const db = readDb();
  const settings = getSettings(db);
  const rows = [
    ['낙찰자명','전화번호','경매구분','경매날짜','낙찰개체','개체정보','업체','낙찰원금','결제방식','개체별 결제금액','수령방법','방문수령날짜','도도시 맡기는곳','도도시 받는곳','메모','상태','신청/수정일']
  ];
  (db.bidders || []).forEach((bidder) => {
    const summary = bidderTotals(bidder, settings);
    const payments = bidder.payments || bidder.shipping?.payments || {};
    (bidder.items || []).forEach((item) => {
      const app = getItemApplication(bidder, item.id);
      const breakdown = summary.itemBreakdown.find((entry) => entry.itemId === item.id) || {};
      rows.push([
        bidder.name,
        bidder.phone,
        item.auctionType || '',
        item.auctionDate || '',
        item.title,
        item.detail,
        item.vendor,
        item.price,
        app?.paymentMethod || payments[item.id] || '이체',
        app ? (breakdown.payable || app.paymentSummary?.finalTotal || '') : '',
        app?.method || '',
        app?.pickupDate || '',
        app?.dodosiFrom || '',
        app?.dodosiTo || '',
        app?.memo || '',
        app?.status || '미신청',
        app?.updatedAt || ''
      ]);
    });
  });
  const csv = '\ufeff' + rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="reptile-gallery-item-applications.csv"');
  res.send(csv);
});

app.get('/health', (req, res) => res.json({ ok: true, version: APP_VERSION, publicDir: PUBLIC_DIR, dbPath: DB_PATH, embeddedPublic: true }));
app.get('/api/version', (req, res) => res.json({ version: APP_VERSION, publicDir: PUBLIC_DIR, dbPath: DB_PATH, embeddedPublic: true }));

function getLanUrls(port) {
  const interfaces = os.networkInterfaces();
  const urls = [];
  Object.values(interfaces).flat().forEach((info) => {
    if (!info || info.family !== 'IPv4' || info.internal) return;
    urls.push(`http://${info.address}:${port}`);
  });
  return urls;
}

app.get('/api/network', (req, res) => {
  res.json({ local: `http://localhost:${PORT}`, lan: getLanUrls(PORT), admin: { local: `http://localhost:${PORT}/admin.html`, lan: getLanUrls(PORT).map((url) => `${url}/admin.html`) } });
});

app.listen(PORT, HOST, () => {
  const lanUrls = getLanUrls(PORT);
  console.log('');
  console.log(`렙타일갤러리 결제/수령 신청 사이트가 실행되었습니다. ${APP_VERSION}`);
  console.log(`컴퓨터 접속: http://localhost:${PORT}`);
  if (lanUrls.length) {
    console.log('핸드폰 접속:');
    lanUrls.forEach((url) => console.log(`  ${url}`));
    console.log('관리자 페이지:');
    lanUrls.forEach((url) => console.log(`  ${url}/admin.html`));
  } else {
    console.log('핸드폰 접속용 내부 IP를 찾지 못했습니다. ipconfig에서 IPv4 주소를 확인해 주세요.');
  }
});
