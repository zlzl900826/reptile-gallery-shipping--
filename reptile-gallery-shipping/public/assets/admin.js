const money = new Intl.NumberFormat('ko-KR');
let PASSWORD = sessionStorage.getItem('rgAdminPassword') || '';
let STATE = { bidders: [], settings: {} };
let RECENTLY_ADDED_BIDDER_ID = '';
let RECENTLY_SAVED_ITEM_ID = '';

function won(value) { return `${money.format(Math.round(Number(value || 0)))}원`; }
function qs(selector, root = document) { return root.querySelector(selector); }
function qsa(selector, root = document) { return [...root.querySelectorAll(selector)]; }
function escapeHtml(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function safeText(value = '') { return escapeHtml(value); }

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      'x-admin-password': PASSWORD,
      ...(options.headers || {})
    },
    ...options
  });
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error(data.message || '요청을 처리하지 못했습니다.');
  return data;
}

function itemTotal(bidder) {
  return (bidder.items || []).reduce((sum, item) => sum + Number(item.price || 0), 0);
}
function finalTotal(bidder) {
  return Number(bidder.totals?.finalTotal ?? bidder.shipping?.paymentSummary?.finalTotal ?? itemTotal(bidder));
}
function getItemApplication(bidder, itemId) {
  return bidder?.itemApplications?.[itemId] || null;
}
function normalizePaymentMethod(method) {
  if (method === '카드/피들') return '피들';
  if (['이체', '카드', '피들'].includes(method)) return method;
  return '';
}

async function loadAdmin() {
  const data = await api('/api/admin/bidders');
  STATE = data;
  populateSettings(data.settings || {});
  renderList();
}

function populateSettings(settings) {
  const form = qs('#settingsForm');
  Object.entries(settings).forEach(([key, value]) => {
    const input = qs(`[name="${key}"]`, form);
    if (input && key !== 'dodosiStations') input.value = value ?? '';
  });
}

function paymentLabel(method) {
  if (method === '카드/피들' || method === '피들') return '피들 3.3% 추가';
  if (method === '카드') return '카드 추가/할인 없음';
  if (method === '이체') return '이체 5% 할인';
  return '미선택';
}

function getDateFilters() {
  return {
    single: qs('#auctionDateFilter')?.value || '',
    start: qs('#auctionDateStartFilter')?.value || '',
    end: qs('#auctionDateEndFilter')?.value || ''
  };
}

function itemMatchesDate(item, filters = getDateFilters()) {
  const date = item.auctionDate || '';
  if (filters.single && date !== filters.single) return false;
  if (filters.start && (!date || date < filters.start)) return false;
  if (filters.end && (!date || date > filters.end)) return false;
  return true;
}

function dateFilterLabel() {
  const filters = getDateFilters();
  if (filters.single) return `${filters.single} 경매 검색 기준`;
  if (filters.start && filters.end) return `${filters.start} ~ ${filters.end} 경매 기간 검색 기준`;
  if (filters.start) return `${filters.start} 이후 경매 검색 기준`;
  if (filters.end) return `${filters.end} 이전 경매 검색 기준`;
  const keyword = qs('#adminSearch')?.value.trim() || '';
  return keyword ? '검색 결과 기준' : '전체 낙찰자 기준';
}

function clearSingleDateFilter() {
  const el = qs('#auctionDateFilter');
  if (el) el.value = '';
}

function clearRangeDateFilter() {
  const start = qs('#auctionDateStartFilter');
  const end = qs('#auctionDateEndFilter');
  if (start) start.value = '';
  if (end) end.value = '';
}

function clearAllListFilters() {
  const search = qs('#adminSearch');
  const single = qs('#auctionDateFilter');
  if (search) search.value = '';
  if (single) single.value = '';
  clearRangeDateFilter();
}

function scrollToAdminList() {
  const target = qs('#overallSummary') || qs('#adminList');
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openBidderItems(card) {
  const itemsArea = qs('.admin-items', card);
  const toggleButton = qs('[data-action="toggle-bidder-items"]', card);
  if (!itemsArea) return;
  itemsArea.hidden = false;
  itemsArea.classList.remove('is-collapsed');
  if (toggleButton) toggleButton.textContent = '손님 현황 닫기';
}

function closeBidderItems(card) {
  const itemsArea = qs('.admin-items', card);
  const toggleButton = qs('[data-action="toggle-bidder-items"]', card);
  if (!itemsArea) return;
  itemsArea.hidden = true;
  itemsArea.classList.add('is-collapsed');
  if (toggleButton) toggleButton.textContent = '손님 현황 열기';
}

function closeOtherBidderItems(targetCard) {
  qsa('.admin-bidder').forEach((card) => {
    if (card === targetCard) return;
    closeBidderItems(card);
    qsa('.item-edit-details', card).forEach((details) => {
      details.open = false;
    });
    qsa('.admin-item-editor', card).forEach((itemCard) => {
      itemCard.classList.remove('jump-highlight');
    });
  });
}

function scrollToAdminItem(bidderId, itemId) {
  const target = qsa('.admin-item-editor').find((el) => {
    return String(el.dataset.bidderId || '') === String(bidderId || '') &&
      String(el.dataset.itemId || '') === String(itemId || '');
  });

  if (!target) return;

  const bidderCard = target.closest('.admin-bidder');
  if (bidderCard) {
    closeOtherBidderItems(bidderCard);
    openBidderItems(bidderCard);

    // 같은 손님 안에서도 클릭한 개체만 열고 나머지 개체 수정창은 모두 닫기
    qsa('.item-edit-details', bidderCard).forEach((details) => {
      details.open = false;
    });
    qsa('.admin-item-editor', bidderCard).forEach((itemCard) => {
      if (itemCard !== target) itemCard.classList.remove('jump-highlight');
    });
  }

  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  target.classList.add('jump-highlight');
  const details = qs('.item-edit-details', target);
  if (details) details.open = true;

  window.setTimeout(() => {
    target.classList.remove('jump-highlight');
  }, 2400);
}

function renderSummaryJumpLinks(items) {
  if (!items.length) return '없음';
  const rows = items.slice(0, 12).map((entry) => `
    <button class="summary-jump" type="button" data-bidder-id="${safeText(entry.bidderId)}" data-item-id="${safeText(entry.itemId)}">
      ${safeText(entry.label)}
    </button>
  `).join('');
  const more = items.length > 12 ? `<span class="summary-more">외 ${items.length - 12}개</span>` : '';
  return `<div class="summary-jump-list">${rows}${more}</div>`;
}

function getVisibleItems(bidder) {
  const filters = getDateFilters();
  return (bidder.items || []).filter((item) => itemMatchesDate(item, filters));
}

function calculateAdminItemPayable(item, app, paymentMethod) {
  const price = Number(item.price || 0);
  const transferRate = Number(STATE.settings?.transferDiscountRate ?? 5) / 100;
  const fiddleRate = Number(STATE.settings?.fiddleFeeRate ?? STATE.settings?.cardFiddleFeeRate ?? 3.3) / 100;
  const pickupRate = Number(STATE.settings?.storePickupDiscountRate ?? 5) / 100;
  let amount = price;
  if (paymentMethod === '이체') amount *= (1 - transferRate);
  if (paymentMethod === '피들') amount *= (1 + fiddleRate);
  if (app?.method === '매장 방문수령') amount -= price * pickupRate;
  return Math.max(0, Math.round(amount));
}

function isItemApplicationDone(app) {
  if (!app) return false;
  const status = String(app.status || '').trim();
  return status !== '' && status !== '미신청';
}

function isItemPaymentComplete(app) {
  if (!app) return false;
  return String(app.status || '').trim() === '결제완료';
}

function getItemPayable(item, bidder) {
  const app = getItemApplication(bidder, item.id) || null;
  if (!isItemApplicationDone(app)) return 0;
  const payments = bidder.payments || bidder.shipping?.payments || {};
  const paymentMethod = normalizePaymentMethod(app.paymentMethod || payments[item.id] || '');
  return Number(app.paymentSummary?.finalTotal ?? calculateAdminItemPayable(item, app, paymentMethod));
}

function getBidderProgress(bidder, items) {
  const targetItems = items || bidder.items || [];
  const doneItems = [];
  const pendingItems = [];
  let totalPayable = 0;

  targetItems.forEach((item) => {
    const app = getItemApplication(bidder, item.id);
    if (isItemApplicationDone(app)) {
      doneItems.push(item);
      totalPayable += getItemPayable(item, bidder);
    } else {
      pendingItems.push(item);
    }
  });

  return {
    itemCount: targetItems.length,
    doneCount: doneItems.length,
    pendingCount: pendingItems.length,
    doneItems,
    pendingItems,
    totalPayable
  };
}

function itemTitleList(items) {
  if (!items.length) return '없음';
  return items.map((item) => item.title || '낙찰 개체').join(', ');
}


function auctionClass(types = []) {
  const set = new Set(types.filter(Boolean));
  if (set.has('라이브경매') && set.has('밴드경매')) return 'mixed';
  if (set.has('라이브경매')) return 'live';
  if (set.has('밴드경매')) return 'band';
  return 'unknown';
}

function auctionLabel(types = []) {
  const set = [...new Set(types.filter(Boolean))];
  return set.length ? set.join(' / ') : '경매 구분 미입력';
}

function auctionTooltip({ date, types, items, doneCount, totalPayable }) {
  const itemLines = items.map((item) => `- ${item.title || '낙찰 개체'} (${item.auctionType || '구분 미입력'})`).join('\n');
  return [
    `경매 날짜: ${date || '날짜 미입력'}`,
    `경매 구분: ${auctionLabel(types)}`,
    `신청완료: ${doneCount}/${items.length}개`,
    `토탈 결제금액: ${won(totalPayable)}`,
    '낙찰 개체:',
    itemLines || '- 없음'
  ].join('\n');
}

function getAuctionDateGroups(bidder, items) {
  const map = new Map();
  (items || []).forEach((item) => {
    const dateKey = item.auctionDate || '날짜 미입력';
    if (!map.has(dateKey)) map.set(dateKey, []);
    map.get(dateKey).push(item);
  });
  return [...map.entries()].sort(([a], [b]) => {
    if (a === '날짜 미입력') return 1;
    if (b === '날짜 미입력') return -1;
    return a.localeCompare(b);
  }).map(([date, groupItems]) => {
    const progress = getBidderProgress(bidder, groupItems);
    const types = groupItems.map((item) => item.auctionType || '');
    return { date, items: groupItems, types, progress };
  });
}

function renderAuctionDateChips(bidder, items) {
  const groups = getAuctionDateGroups(bidder, items);
  if (!groups.length) return '<span class="muted tiny">표시할 경매 날짜가 없습니다.</span>';
  return groups.map((group) => {
    const cls = auctionClass(group.types);
    const title = safeText(auctionTooltip({
      date: group.date,
      types: group.types,
      items: group.items,
      doneCount: group.progress.doneCount,
      totalPayable: group.progress.totalPayable
    }));
    return `
      <span class="auction-date-chip ${cls}" title="${title}">
        <span class="auction-date-main">${safeText(group.date)}</span>
        <small>${safeText(auctionLabel(group.types))}</small>
        <em>완료 ${group.progress.doneCount}/${group.items.length} · ${won(group.progress.totalPayable)}</em>
      </span>
    `;
  }).join('');
}

function getKeywordFilteredBidders() {
  const keyword = qs('#adminSearch')?.value.trim().toLowerCase() || '';
  return (STATE.bidders || []).filter((bidder) => {
    const text = JSON.stringify(bidder).toLowerCase();
    return !keyword || text.includes(keyword);
  });
}

function getAuctionDateQuickGroups() {
  const map = new Map();
  const bidders = getKeywordFilteredBidders();
  bidders.forEach((bidder) => {
    (bidder.items || []).forEach((item) => {
      if (!item.auctionDate) return;
      if (!map.has(item.auctionDate)) map.set(item.auctionDate, []);
      map.get(item.auctionDate).push({ bidder, item });
    });
  });
  return [...map.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([date, entries]) => {
    const items = entries.map((entry) => entry.item);
    const types = items.map((item) => item.auctionType || '');
    const liveCount = items.filter((item) => item.auctionType === '라이브경매').length;
    const bandCount = items.filter((item) => item.auctionType === '밴드경매').length;
    const unknownCount = items.length - liveCount - bandCount;
    const bidderNames = [...new Set(entries.map((entry) => entry.bidder.name || '낙찰자'))];
    return { date, entries, items, types, liveCount, bandCount, unknownCount, bidderNames };
  });
}

function quickDateTooltip(group) {
  const itemLines = group.entries
    .slice(0, 12)
    .map(({ bidder, item }) => `- ${bidder.name || '낙찰자'}: ${item.title || '낙찰 개체'} (${item.auctionType || '구분 미입력'})`)
    .join('\n');
  const more = group.entries.length > 12 ? `\n- 외 ${group.entries.length - 12}개` : '';
  return [
    `경매 날짜: ${group.date}`,
    `경매 구분: ${auctionLabel(group.types)}`,
    `라이브경매: ${group.liveCount}개`,
    `밴드경매: ${group.bandCount}개`,
    group.unknownCount ? `구분 미입력: ${group.unknownCount}개` : '',
    `낙찰자: ${group.bidderNames.join(', ')}`,
    '낙찰 개체:',
    `${itemLines}${more}`
  ].filter(Boolean).join('\n');
}

function renderAuctionDateQuickList() {
  const box = qs('#auctionDateQuickList');
  if (!box) return;
  const groups = getAuctionDateQuickGroups();
  const filters = getDateFilters();
  const current = filters.single;
  if (!groups.length) {
    box.innerHTML = '<span class="muted tiny">등록된 경매 날짜가 없습니다.</span>';
    return;
  }
  box.innerHTML = groups.map((group) => {
    const cls = auctionClass(group.types);
    const active = group.date === current ? 'active' : '';
    const title = safeText(quickDateTooltip(group));
    return `
      <button class="auction-date-quick ${cls} ${active}" type="button" data-date="${safeText(group.date)}" title="${title}">
        <strong>${safeText(group.date)}</strong>
        <small>${safeText(auctionLabel(group.types))}</small>
        <em>총 ${group.items.length}개 · 라이브 ${group.liveCount} · 밴드 ${group.bandCount}</em>
      </button>
    `;
  }).join('');

  qsa('.auction-date-quick', box).forEach((button) => {
    button.addEventListener('click', () => {
      qs('#auctionDateFilter').value = button.dataset.date || '';
      clearRangeDateFilter();
      renderList();
    });
  });
}

function setSelectValue(root, name, value) {
  const el = qs(`[name="${name}"]`, root);
  if (el) el.value = value ?? '';
}

function renderItem(item, bidder) {
  const card = document.createElement('div');
  card.className = 'item-card admin-item-editor clean-item-card';
  card.dataset.bidderId = bidder.id || '';
  card.dataset.itemId = item.id || '';
  if (RECENTLY_SAVED_ITEM_ID === item.id) card.classList.add('recently-saved');
  const payments = bidder.payments || bidder.shipping?.payments || {};
  const app = getItemApplication(bidder, item.id) || {};
  const paymentMethod = normalizePaymentMethod(app.paymentMethod || payments[item.id] || '');
  const status = app.status || '미신청';
  const payable = app.paymentSummary?.finalTotal || calculateAdminItemPayable(item, app, paymentMethod);
  const memoPreview = String(app.memo || '').trim();

  const itemAuctionCls = auctionClass([item.auctionType || '']);
  const itemAuctionTitle = safeText(`${item.auctionDate || '날짜 미입력'} · ${item.auctionType || '경매 구분 미입력'}`);
  const statusClass = status === '결제완료' ? 'ok' : (status === '미신청' ? 'warn' : 'normal');

  card.innerHTML = `
    <form class="item-edit-form form-stack">
      <div class="item-edit-head clean-item-head">
        <div class="item-clean-main">
          <div class="item-title-row">
            <strong>${safeText(item.title || '낙찰 개체')}</strong>
            <span class="status-mini ${statusClass}">${safeText(status)}</span>
          </div>
          <div class="item-auction-line">
            <span class="auction-date-pill ${itemAuctionCls}" title="${itemAuctionTitle}">${safeText(item.auctionDate || '날짜 미입력')}</span>
            <span class="muted tiny">${safeText(item.auctionType || '경매 구분 미입력')} · ${safeText(paymentLabel(paymentMethod))}</span>
          </div>
          <div class="clean-info-line">
            ${app.method ? `<span>${safeText(app.method)}</span>` : '<span>수령 미선택</span>'}
            ${app.pickupDate ? `<span>방문일 ${safeText(app.pickupDate)}</span>` : ''}
            ${app.dodosiTo ? `<span>도도시 ${safeText(app.dodosiTo)}</span>` : ''}
            ${memoPreview ? `<span class="memo-preview" title="${safeText(memoPreview)}">요청사항: ${safeText(memoPreview.length > 28 ? memoPreview.slice(0, 28) + '...' : memoPreview)}</span>` : '<span class="muted">요청사항 없음</span>'}
          </div>
        </div>
        <div class="price-stack">
          <span class="price">${won(item.price)}</span>
          ${app.itemId ? `<span class="muted tiny">결제금액 ${won(payable)}</span>` : '<span class="muted tiny">미신청</span>'}
        </div>
      </div>

      <details class="item-edit-details">
        <summary>개체별 수정 / 요청사항 수정</summary>
        <div class="form-stack item-edit-body">
          <div class="two-col">
            <label>낙찰 개체명<input name="title" required value="${safeText(item.title || '')}"></label>
            <label>낙찰 금액<input name="price" type="number" min="0" step="10000" value="${Number(item.price || 0)}"></label>
          </div>
          <div class="three-col">
            <label>경매 구분
              <select name="auctionType">
                <option value="">선택</option>
                <option value="라이브경매">라이브경매</option>
                <option value="밴드경매">밴드경매</option>
              </select>
            </label>
            <label>경매 날짜<input name="auctionDate" type="date" value="${safeText(item.auctionDate || '')}"></label>
            <label>출품 업체<input name="vendor" value="${safeText(item.vendor || '렙타일갤러리')}"></label>
          </div>
          <label>개체 정보<textarea name="detail" rows="2">${safeText(item.detail || '')}</textarea></label>

          <div class="three-col">
            <label>결제방식
              <select name="paymentMethod">
                <option value="">미선택</option>
                <option value="이체">이체 5% 할인</option>
                <option value="카드">카드 추가/할인 없음</option>
                <option value="피들">피들 3.3% 추가</option>
              </select>
            </label>
            <label>수령방법
              <select name="method">
                <option value="">미선택</option>
                <option value="매장 방문수령">매장 방문수령</option>
                <option value="도도시">도도시</option>
              </select>
            </label>
            <label>상태
              <select name="status">
                <option>미신청</option>
                <option>신청완료</option>
                <option>확인중</option>
                <option>결제대기</option>
                <option>결제완료</option>
                <option>도도시예약완료</option>
                <option>방문수령완료</option>
              </select>
            </label>
          </div>

          <div class="two-col">
            <label>방문수령 날짜<input name="pickupDate" type="date" value="${safeText(app.pickupDate || '')}"></label>
            <label>도도시 받는곳<input name="dodosiTo" value="${safeText(app.dodosiTo || '')}" placeholder="손님이 입력한 받는 정거샵명"></label>
          </div>
          <label>메모 또는 요청사항
            <textarea name="memo" rows="3" placeholder="손님 신청 페이지 메모/요청사항 수정 가능">${safeText(app.memo || '')}</textarea>
          </label>

          <div class="admin-actions">
            <button class="primary" type="submit">개체 저장</button>
            <button class="danger" type="button" data-action="delete-item">개체 삭제</button>
          </div>
          <p class="form-message"></p>
        </div>
      </details>
    </form>
  `;

  const form = qs('.item-edit-form', card);
  setSelectValue(form, 'auctionType', item.auctionType || '');
  setSelectValue(form, 'paymentMethod', paymentMethod || '');
  setSelectValue(form, 'method', app.method || '');
  setSelectValue(form, 'status', status);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const msg = qs('.form-message', form);
    msg.className = 'form-message';
    msg.textContent = '저장 중...';
    const payload = Object.fromEntries(new FormData(form).entries());
    payload.price = Number(payload.price || 0);
    try {
      await api(`/api/admin/bidders/${bidder.id}/items/${item.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      RECENTLY_SAVED_ITEM_ID = item.id;
      msg.classList.add('ok');
      msg.textContent = '개체 정보와 요청사항이 저장되었습니다.';
      await loadAdmin();
    } catch (err) {
      msg.classList.add('err');
      msg.textContent = err.message;
    }
  });

  qs('[data-action="delete-item"]', card).addEventListener('click', async () => {
    if (!confirm('이 낙찰 개체를 삭제할까요? 개체가 1개뿐이면 낙찰자도 함께 삭제됩니다.')) return;
    await api(`/api/admin/bidders/${bidder.id}/items/${item.id}`, { method: 'DELETE' });
    await loadAdmin();
  });

  return card;
}

function renderAdminCard(bidder) {
  const template = qs('#adminCardTemplate').content.cloneNode(true);
  const card = qs('.admin-bidder', template);
  card.dataset.bidderId = bidder.id || '';
  if (RECENTLY_ADDED_BIDDER_ID === bidder.id) card.classList.add('recently-added');
  const visibleItems = getVisibleItems(bidder);
  const progress = getBidderProgress(bidder, visibleItems);
  const filters = getDateFilters();
  const activeDateLabel = (filters.single || filters.start || filters.end) ? ` · ${dateFilterLabel()}` : '';

  qs('.admin-name', card).textContent = bidder.name;
  qs('.admin-meta', card).innerHTML = `
    <span>${safeText(bidder.phone || '')}</span>
    ${activeDateLabel ? `<span>${safeText(activeDateLabel.replace(/^ · /, ''))}</span>` : ''}
    <span>낙찰개체 ${progress.itemCount}개</span>
  `;

  const headActions = qs('.admin-head-actions', card);
  if (headActions) {
    headActions.insertAdjacentHTML('afterbegin', '<button class="secondary" type="button" data-action="toggle-bidder-items">손님 현황 열기</button>');
  }

  const summaryArea = qs('.admin-summary', card);
  summaryArea.classList.add('admin-summary-clean');
  summaryArea.innerHTML = `
    <div class="summary-chip ${progress.pendingCount ? 'warn' : 'ok'}"><span>신청완료</span><strong>${progress.doneCount}/${progress.itemCount}개</strong></div>
    <div class="summary-chip total"><span>토탈 결제금액</span><strong>${won(progress.totalPayable)}</strong></div>
    <div class="summary-chip"><span>미완료 수</span><strong>${progress.pendingCount}개</strong></div>
    <div class="summary-wide auction-date-summary">
      <span>경매 날짜</span>
      <div class="auction-date-cells">${renderAuctionDateChips(bidder, visibleItems)}</div>
    </div>
    <div class="summary-wide ${progress.pendingCount ? 'warn' : 'ok'}">
      <span>미완료 개체</span>
      <strong>${safeText(itemTitleList(progress.pendingItems))}</strong>
    </div>
  `;

  const itemsArea = qs('.admin-items', card);
  visibleItems.forEach((item) => itemsArea.appendChild(renderItem(item, bidder)));

  const shouldOpenItems = RECENTLY_ADDED_BIDDER_ID === bidder.id || visibleItems.some((item) => item.id === RECENTLY_SAVED_ITEM_ID);
  if (shouldOpenItems) openBidderItems(card);
  else closeBidderItems(card);

  const toggleItemsButton = qs('[data-action="toggle-bidder-items"]', card);
  if (toggleItemsButton) {
    toggleItemsButton.addEventListener('click', () => {
      if (itemsArea.hidden) {
        closeOtherBidderItems(card);
        qsa('.item-edit-details', card).forEach((details) => {
          details.open = false;
        });
        openBidderItems(card);
      } else {
        closeBidderItems(card);
        qsa('.item-edit-details', card).forEach((details) => {
          details.open = false;
        });
      }
    });
  }

  qs('[data-action="delete-bidder"]', card).addEventListener('click', async () => {
    if (!confirm(`${bidder.name} 낙찰자를 삭제할까요?`)) return;
    await api(`/api/admin/bidders/${bidder.id}`, { method: 'DELETE' });
    await loadAdmin();
  });
  return card;
}

function getFilteredBidders() {
  const filters = getDateFilters();
  return getKeywordFilteredBidders().filter((bidder) => {
    return (bidder.items || []).some((item) => itemMatchesDate(item, filters));
  });
}

function getOverallProgress(bidders) {
  const summary = {
    bidderCount: bidders.length,
    itemCount: 0,
    doneCount: 0,
    pendingCount: 0,
    paymentCompleteCount: 0,
    paymentCompleteTotal: 0,
    totalPayable: 0,
    pendingLabels: [],
    paymentPendingLabels: [],
    filterLabel: dateFilterLabel()
  };

  bidders.forEach((bidder) => {
    const visibleItems = getVisibleItems(bidder);
    const progress = getBidderProgress(bidder, visibleItems);
    summary.itemCount += progress.itemCount;
    summary.doneCount += progress.doneCount;
    summary.pendingCount += progress.pendingCount;
    summary.totalPayable += progress.totalPayable;
    visibleItems.forEach((item) => {
      const app = getItemApplication(bidder, item.id);
      if (isItemPaymentComplete(app)) {
        summary.paymentCompleteCount += 1;
        summary.paymentCompleteTotal += getItemPayable(item, bidder);
      } else if (isItemApplicationDone(app)) {
        summary.paymentPendingLabels.push({
          label: `${bidder.name || '낙찰자'} - ${item.title || '낙찰 개체'}`,
          bidderId: bidder.id,
          itemId: item.id
        });
      }
    });
    progress.pendingItems.forEach((item) => {
      summary.pendingLabels.push({
        label: `${bidder.name || '낙찰자'} - ${item.title || '낙찰 개체'}`,
        bidderId: bidder.id,
        itemId: item.id
      });
    });
  });

  return summary;
}

function renderOverallSummary(bidders) {
  const box = qs('#overallSummary');
  if (!box) return;
  const summary = getOverallProgress(bidders);
  const pendingPreview = renderSummaryJumpLinks(summary.pendingLabels);
  const paymentPendingPreview = renderSummaryJumpLinks(summary.paymentPendingLabels);

  box.innerHTML = `
    <div class="overall-summary-head">
      <div>
        <p class="eyebrow">TOTAL SUMMARY</p>
        <h3>전체 신청 현황</h3>
      </div>
      <span class="overall-filter-label">${safeText(summary.filterLabel)}</span>
    </div>
    <div class="overall-summary-grid">
      <div class="overall-stat"><span>낙찰자</span><strong>${summary.bidderCount}명</strong></div>
      <div class="overall-stat"><span>낙찰개체</span><strong>${summary.itemCount}개</strong></div>
      <div class="overall-stat ${summary.pendingCount ? 'warn' : 'ok'}"><span>신청완료</span><strong>${summary.doneCount}/${summary.itemCount}개</strong></div>
      <div class="overall-stat ${summary.paymentCompleteCount === summary.doneCount && summary.doneCount ? 'ok' : 'warn'}"><span>결제완료</span><strong>${summary.paymentCompleteCount}/${summary.doneCount}개</strong></div>
      <div class="overall-stat total"><span>전체 토탈 결제금액</span><strong>${won(summary.totalPayable)}</strong></div>
      <div class="overall-stat total payment-total"><span>결제완료 금액</span><strong>${won(summary.paymentCompleteTotal)}</strong></div>
    </div>
    <div class="overall-pending ${summary.pendingCount ? 'warn' : 'ok'}">
      <span>미완료 개체</span>
      <strong>${pendingPreview}</strong>
    </div>
    <div class="overall-pending ${summary.paymentPendingLabels.length ? 'warn' : 'ok'}">
      <span>신청완료 후 결제대기/확인중 개체</span>
      <strong>${paymentPendingPreview}</strong>
    </div>
  `;

  qsa('.summary-jump', box).forEach((button) => {
    button.addEventListener('click', () => {
      scrollToAdminItem(button.dataset.bidderId, button.dataset.itemId);
    });
  });
}

function renderList() {
  const list = qs('#adminList');
  list.innerHTML = '';
  renderAuctionDateQuickList();
  const bidders = getFilteredBidders();
  renderOverallSummary(bidders);
  if (!bidders.length) {
    list.innerHTML = '<div class="empty"><p>표시할 낙찰자가 없습니다.</p></div>';
    return;
  }
  bidders.forEach((bidder) => list.appendChild(renderAdminCard(bidder)));
}

function showAdmin() {
  qs('#loginCard').classList.add('hidden');
  qs('#adminApp').classList.remove('hidden');
}

function collectForm(form) { return Object.fromEntries(new FormData(form).entries()); }

function downloadCsv() {
  fetch('/api/admin/export.csv', { headers: { 'x-admin-password': PASSWORD } })
    .then((res) => {
      if (!res.ok) throw new Error('CSV 다운로드 실패');
      return res.blob();
    })
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'reptile-gallery-payment-pickup.csv';
      a.click();
      URL.revokeObjectURL(url);
    })
    .catch((err) => alert(err.message));
}

document.addEventListener('DOMContentLoaded', async () => {
  qs('#loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    PASSWORD = qs('#passwordInput').value;
    sessionStorage.setItem('rgAdminPassword', PASSWORD);
    try {
      await loadAdmin();
      showAdmin();
    } catch (err) {
      qs('#loginMessage').className = 'form-message err';
      qs('#loginMessage').textContent = err.message;
    }
  });

  if (PASSWORD) {
    try {
      await loadAdmin();
      showAdmin();
    } catch {
      sessionStorage.removeItem('rgAdminPassword');
    }
  }

  qs('#addForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const msg = qs('#addMessage');
    msg.className = 'form-message';
    msg.textContent = '등록 중...';
    const payload = collectForm(event.currentTarget);
    payload.price = Number(payload.price || 0);
    try {
      const created = await api('/api/admin/bidders', { method: 'POST', body: JSON.stringify(payload) });
      RECENTLY_ADDED_BIDDER_ID = created.bidder?.id || '';
      event.currentTarget.reset();
      clearAllListFilters();
      msg.classList.add('ok');
      msg.textContent = '등록되었습니다. 아래 낙찰자 목록에 자동 반영했습니다.';
      await loadAdmin();
      scrollToAdminList();
    } catch (err) {
      msg.classList.add('err');
      msg.textContent = err.message;
    }
  });

  qs('#settingsForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const msg = qs('#settingsMessage');
    msg.className = 'form-message';
    msg.textContent = '저장 중...';
    const payload = collectForm(event.currentTarget);
    payload.storePickupDiscountRate = Number(payload.storePickupDiscountRate || 0);
    payload.transferDiscountRate = Number(payload.transferDiscountRate || 0);
    payload.fiddleFeeRate = Number(payload.fiddleFeeRate || 0);
    payload.cardFiddleFeeRate = payload.fiddleFeeRate;
    payload.userLookupDays = Number(payload.userLookupDays || 7);
    try {
      await api('/api/settings', { method: 'PUT', body: JSON.stringify(payload) });
      msg.classList.add('ok');
      msg.textContent = '설정이 저장되었습니다.';
      await loadAdmin();
    } catch (err) {
      msg.classList.add('err');
      msg.textContent = err.message;
    }
  });

  qs('#adminSearch').addEventListener('input', renderList);
  qs('#auctionDateFilter').addEventListener('change', () => {
    clearRangeDateFilter();
    renderList();
  });
  ['#auctionDateStartFilter', '#auctionDateEndFilter'].forEach((selector) => {
    qs(selector)?.addEventListener('change', () => {
      clearSingleDateFilter();
      renderList();
    });
  });
  qs('#clearFilterButton').addEventListener('click', () => {
    qs('#adminSearch').value = '';
    qs('#auctionDateFilter').value = '';
    clearRangeDateFilter();
    renderList();
  });
  qs('#csvButton').addEventListener('click', downloadCsv);
});
