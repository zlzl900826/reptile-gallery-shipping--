const money = new Intl.NumberFormat('ko-KR');
let SETTINGS = {};
let LAST_SEARCH_RESULTS = [];
let CURRENT_BIDDER = null;

function won(value) { return `${money.format(Math.round(Number(value || 0)))}원`; }
function qs(selector, root = document) { return root.querySelector(selector); }
function qsa(selector, root = document) { return [...root.querySelectorAll(selector)]; }
function safeText(value) { return String(value ?? '').replace(/[<>&"']/g, (m) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[m])); }

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || '요청을 처리하지 못했습니다.');
  return data;
}

function getRates() {
  return {
    pickupDiscount: Number(SETTINGS.storePickupDiscountRate ?? 5) / 100,
    transferDiscount: Number(SETTINGS.transferDiscountRate ?? 5) / 100,
    fiddleFee: Number(SETTINGS.fiddleFeeRate ?? SETTINGS.cardFiddleFeeRate ?? 3.3) / 100
  };
}

function normalizePaymentMethod(method) {
  if (method === '카드/피들') return '피들';
  if (['이체', '카드', '피들'].includes(method)) return method;
  return '이체';
}

function paymentMultiplier(method) {
  const rates = getRates();
  const normalized = normalizePaymentMethod(method);
  if (normalized === '이체') return 1 - rates.transferDiscount;
  if (normalized === '피들') return 1 + rates.fiddleFee;
  return 1;
}

function stationId(region, name, address, index) {
  return `${region}-${name}-${address}-${index}`.replace(/[^a-zA-Z0-9가-힣]+/g, '-').replace(/^-|-$/g, '') || `station-${index}`;
}

function parseStationText(text = '') {
  return String(text || '').split(/\r?\n/).map((line, index) => {
    const raw = line.trim();
    if (!raw || raw.startsWith('#')) return null;
    const [region = '', name = '', address = '', fee = '0'] = raw.split('|').map((part) => part.trim());
    if (!name) return null;
    return { id: stationId(region, name, address, index), region, name, address, fee: Number(String(fee).replace(/\D/g, '') || 0) };
  }).filter(Boolean);
}

function stationList() {
  const parsed = parseStationText(SETTINGS.dodosiStationsText || '');
  if (parsed.length) return parsed;
  return Array.isArray(SETTINGS.dodosiStations) ? SETTINGS.dodosiStations : [];
}

function stationById(id) {
  const list = stationList();
  return list.find((station) => station.id === id) || list.find((station) => station.name === id);
}

function populateStations(select, selectedId = '') {
  select.innerHTML = '<option value="">받는 정거샵 선택</option>';
  const stations = stationList();
  if (!stations.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = '등록된 정거샵이 없습니다';
    select.appendChild(option);
    return;
  }
  stations.forEach((station) => {
    const option = document.createElement('option');
    option.value = station.id;
    option.textContent = `${station.region} · ${station.name}`;
    select.appendChild(option);
  });
  select.value = selectedId || '';
}

function getItemApplication(bidder, itemId) {
  return bidder?.itemApplications?.[itemId] || null;
}

function calculateSingleItemSummary(form) {
  const price = Number(form.dataset.price || 0);
  const method = qs('input[name="method"]:checked', form)?.value || '';
  const rawPaymentMethod = qs('[name="paymentMethod"]', form)?.value || '';
  const hasPaymentMethod = ['이체', '카드', '피들'].includes(rawPaymentMethod);
  const paymentMethod = hasPaymentMethod ? normalizePaymentMethod(rawPaymentMethod) : '';
  const afterPayment = hasPaymentMethod ? price * paymentMultiplier(paymentMethod) : null;
  const pickupDiscount = method === '매장 방문수령' ? price * getRates().pickupDiscount : 0;
  const finalTotal = hasPaymentMethod ? Math.max(0, Math.round(afterPayment - pickupDiscount)) : null;
  return {
    price: Math.round(price),
    paymentMethod,
    hasPaymentMethod,
    method,
    afterPayment: hasPaymentMethod ? Math.round(afterPayment) : null,
    pickupDiscount: Math.round(pickupDiscount),
    finalTotal
  };
}

function paymentLabel(method) {
  const normalized = normalizePaymentMethod(method);
  if (normalized === '피들') return `피들 ${Number(SETTINGS.fiddleFeeRate ?? SETTINGS.cardFiddleFeeRate ?? 3.3)}% 추가`;
  if (normalized === '카드') return '카드 추가/할인 없음';
  return `이체 ${Number(SETTINGS.transferDiscountRate ?? 5)}% 할인`;
}

function auctionLine(item) {
  if (!item?.auctionType && !item?.auctionDate) return '';
  return `경매: ${item.auctionType || '구분 미입력'}${item.auctionDate ? ` · ${item.auctionDate}` : ''}`;
}

function renderSearchResults(bidders) {
  const resultArea = qs('#resultArea');
  const emptyState = qs('#emptyState');
  resultArea.innerHTML = '';
  emptyState.classList.add('hidden');
  resultArea.classList.remove('hidden');

  bidders.forEach((bidder) => {
    const card = document.createElement('article');
    card.className = 'bidder-panel bidder-list-panel';
    card.innerHTML = `
      <div class="bidder-head">
        <div>
          <p class="eyebrow small">낙찰 목록</p>
          <h3>${safeText(bidder.name)} 님</h3>
          <p class="muted">${safeText(bidder.phone || '')}</p>
        </div>
        <span class="status-pill">개체별 신청</span>
      </div>
      <div class="item-entry-list"></div>
    `;
    const list = qs('.item-entry-list', card);
    (bidder.items || []).forEach((item, index) => {
      const app = getItemApplication(bidder, item.id);
      const final = app?.paymentSummary?.finalTotal;
      const itemCard = document.createElement('div');
      itemCard.className = 'item-card item-entry-card';
      itemCard.innerHTML = `
        <div>
          <strong>${index + 1}. ${safeText(item.title)}</strong>
          <p class="muted tiny">${safeText(item.vendor || '렙타일갤러리')} · ${safeText(item.detail || '상세 정보 없음')}</p>
          ${auctionLine(item) ? `<p class="muted tiny">${safeText(auctionLine(item))}</p>` : ''}
          <p class="muted tiny">상태: ${safeText(app?.status || '미신청')}${app ? ` · ${safeText(app.method || '')} · ${paymentLabel(app.paymentMethod)}` : ''}</p>
          ${app ? `<p class="muted tiny">신청 완료 금액: ${won(final || 0)}</p>` : ''}
        </div>
        <div class="item-actions">
          <span class="price">${won(item.price)}</span>
          <button class="primary" type="button">${app ? '수정하기' : '신청하기'}</button>
        </div>
      `;
      qs('button', itemCard).addEventListener('click', () => renderItemApplication(bidder, item));
      list.appendChild(itemCard);
    });
    resultArea.appendChild(card);
  });
}

function syncConditionalSections(form) {
  const method = qs('input[name="method"]:checked', form)?.value || '';
  qs('.pickup-section', form).classList.toggle('hidden', method !== '매장 방문수령');
  qs('.dodosi-section', form).classList.toggle('hidden', method !== '도도시');
}

function syncDodosi(form) {
  // 도도시 받는 곳은 손님이 직접 입력합니다. 주소/요금 자동 표시는 사용하지 않습니다.
}

function syncTotals(form) {
  syncConditionalSections(form);
  syncDodosi(form);
  const summary = calculateSingleItemSummary(form);
  qs('.item-total', form).textContent = won(summary.price);
  qs('.payment-adjusted-total', form).textContent = summary.hasPaymentMethod ? won(summary.afterPayment) : '결제방식 선택 필요';
  qs('.pickup-discount-total', form).textContent = summary.pickupDiscount ? `-${won(summary.pickupDiscount)}` : '0원';
  qs('.final-total', form).textContent = summary.hasPaymentMethod ? won(summary.finalTotal) : '결제방식을 선택해 주세요';
  const bankWrap = qs('.bank-info-wrap', form);
  if (bankWrap) bankWrap.classList.toggle('hidden', summary.paymentMethod !== '이체');
  return summary;
}

function buildSmsBody({ bidder, item, payload, summary }) {
  const lines = [
    '[렙타일갤러리 결제/수령 신청]',
    `성함: ${bidder.name}`,
    `연락처: ${bidder.phone || ''}`,
    `낙찰개체: ${item.title}`,
    item.auctionType ? `경매구분: ${item.auctionType}` : '',
    item.auctionDate ? `경매날짜: ${item.auctionDate}` : '',
    item.detail ? `개체정보: ${item.detail}` : '',
    `낙찰금액: ${won(item.price)}`,
    `결제방식: ${payload.paymentMethod}`,
    `수령방법: ${payload.method}`,
    payload.method === '매장 방문수령' ? `방문수령 희망일: ${payload.pickupDate}` : '',
    payload.method === '도도시' ? `도도시 맡기는곳: ${payload.dodosiFrom}` : '',
    payload.method === '도도시' ? `도도시 받는곳: ${payload.dodosiTo}` : '',
    `최종 결제금액: ${won(summary.finalTotal)}`,
    payload.paymentMethod === '이체' && SETTINGS.bankInfo ? `입금계좌: ${SETTINGS.bankInfo}` : '',
    payload.memo ? `${SETTINGS.memoRequestLabel || '메모 또는 요청사항'}: ${payload.memo}` : ''
  ].filter(Boolean);
  return lines.join('\n');
}

function openSmsApp(body) {
  const recipient = String(SETTINGS.smsPhone || '').replace(/[^0-9+]/g, '');
  const encoded = encodeURIComponent(body);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const separator = isIOS ? '&' : '?';
  const href = recipient ? `sms:${recipient}${separator}body=${encoded}` : `sms:${separator}body=${encoded}`;
  window.location.href = href;
  return href;
}

function renderItemApplication(bidder, item) {
  CURRENT_BIDDER = bidder;
  const resultArea = qs('#resultArea');
  const app = getItemApplication(bidder, item.id) || {};
  const memoRequestLabel = SETTINGS.memoRequestLabel || '메모 또는 요청사항';
  const memoRequestPlaceholder = SETTINGS.memoRequestPlaceholder || '방문 가능 시간, 도도시 요청사항, 결제 관련 메모';
  resultArea.innerHTML = '';

  const panel = document.createElement('article');
  panel.className = 'bidder-panel item-application-panel';
  panel.innerHTML = `
    <button class="secondary back-button" type="button">← 개체 목록으로 돌아가기</button>
    <div class="bidder-head">
      <div>
        <p class="eyebrow small">개체별 신청</p>
        <h3>${safeText(item.title)}</h3>
        <p class="muted">${safeText(bidder.name)} 님 · ${safeText(bidder.phone || '')}</p>
      </div>
      <span class="status-pill">${safeText(app.status || '미신청')}</span>
    </div>

    <div class="item-card single-item-summary">
      <div>
        <strong>${safeText(item.title)}</strong>
        <p class="muted tiny">${safeText(item.vendor || '렙타일갤러리')} · ${safeText(item.detail || '상세 정보 없음')}</p>
        ${auctionLine(item) ? `<p class="muted tiny">${safeText(auctionLine(item))}</p>` : ''}
      </div>
      <span class="price">${won(item.price)}</span>
    </div>

    <form class="shipping-form form-stack" data-price="${Number(item.price || 0)}">
      <label>결제 방식
        <select name="paymentMethod" required>
          <option value="">결제 방식을 선택해 주세요</option>
          <option value="이체">이체 (${Number(SETTINGS.transferDiscountRate ?? 5)}% 할인)</option>
          <option value="카드">카드 (추가/할인 없음)</option>
          <option value="피들">피들 (${Number(SETTINGS.fiddleFeeRate ?? SETTINGS.cardFiddleFeeRate ?? 3.3)}% 추가)</option>
        </select>
      </label>

      <div class="method-box">
        <p class="label-title">수령 방법 선택</p>
        <div class="method-grid two-methods">
          <label><input type="radio" name="method" value="매장 방문수령" required> 매장 방문수령 <span class="chip">5% 할인</span></label>
          <label><input type="radio" name="method" value="도도시" required> 도도시</label>
        </div>
      </div>

      <div class="pickup-section conditional-section hidden">
        <div class="section-subtitle">매장 방문수령</div>
        <label>방문수령 희망 날짜
          <input name="pickupDate" type="date">
        </label>
        <p class="tiny muted">방문수령 선택 시 낙찰금액에서 ${Number(SETTINGS.storePickupDiscountRate ?? 5)}% 할인이 적용됩니다.</p>
      </div>

      <div class="dodosi-section conditional-section hidden">
        <div class="section-subtitle">도도시 신청 정보</div>
        <div class="two-col">
          <label>맡기는 곳
            <input name="dodosiFrom" class="dodosi-from" type="text" readonly>
          </label>
          <label>받는 곳 정거샵
            <input name="dodosiTo" type="text" placeholder="예: 티그리스게코[강동]">
          </label>
        </div>
        <p class="tiny muted">도도시 받는 곳 정거샵명을 직접 입력해 주세요. 도도시 배송비는 최종 결제금액에 포함하지 않으며, 담당자 확인 후 별도 안내됩니다.</p>
      </div>

      <label>${safeText(memoRequestLabel)}
        <textarea name="memo" rows="3" placeholder="${safeText(memoRequestPlaceholder)}"></textarea>
      </label>

      <label class="bank-info-wrap">입금 계좌
        <input class="bank-info" type="text" readonly>
      </label>

      <div class="summary-box">
        <div><span>낙찰 원금</span><strong class="item-total">0원</strong></div>
        <div><span>결제방식 반영 금액</span><strong class="payment-adjusted-total">0원</strong></div>
        <div><span>매장 방문수령 할인</span><strong class="pickup-discount-total">0원</strong></div>
        <div class="grand"><span>최종 결제금액</span><strong class="final-total">0원</strong></div>
      </div>

      <button class="primary" type="submit">결제/수령 정보 등록 완료</button>
      <p class="form-message"></p>
    </form>
  `;

  qs('.back-button', panel).addEventListener('click', () => renderSearchResults(LAST_SEARCH_RESULTS));

  const form = qs('.shipping-form', panel);
  qs('[name="paymentMethod"]', form).value = app.paymentMethod ? normalizePaymentMethod(app.paymentMethod) : '';
  qs('[name="pickupDate"]', form).value = app.pickupDate || '';
  qs('[name="memo"]', form).value = app.memo || '';
  qs('[name="dodosiFrom"]', form).value = SETTINGS.dodosiDepositShop || '렙타일갤러리-화성 봉담';
  qs('.bank-info', form).value = SETTINGS.bankInfo || '입금계좌 입력 필요';
  if (qs('[name="dodosiTo"]', form)) qs('[name="dodosiTo"]', form).value = app.dodosiTo || '';

  if (app.method) {
    const selected = qs(`input[name="method"][value="${CSS.escape(app.method)}"]`, form);
    if (selected) selected.checked = true;
  }

  form.addEventListener('change', () => syncTotals(form));
  form.addEventListener('input', () => syncTotals(form));
  syncTotals(form);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const msg = qs('.form-message', form);
    msg.className = 'form-message';
    msg.textContent = '저장 중입니다...';

    const method = qs('input[name="method"]:checked', form)?.value || '';
    const paymentMethod = qs('[name="paymentMethod"]', form).value || '';
    if (!['이체', '카드', '피들'].includes(paymentMethod)) {
      msg.classList.add('err');
      msg.textContent = '결제 방식을 선택해 주세요.';
      return;
    }
    const summary = syncTotals(form);
    const payload = {
      method,
      paymentMethod,
      pickupDate: qs('[name="pickupDate"]', form).value,
      dodosiFrom: qs('[name="dodosiFrom"]', form).value,
      dodosiStationId: '',
      dodosiTo: method === '도도시' ? (qs('[name="dodosiTo"]', form).value || '').trim() : '',
      dodosiRegion: '',
      dodosiAddress: '',
      memo: qs('[name="memo"]', form).value
    };

    try {
      const saved = await api(`/api/bidders/${bidder.id}/items/${item.id}/application`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      msg.classList.add('ok');
      const smsBody = buildSmsBody({ bidder, item, payload, summary });
      const smsHref = openSmsApp(smsBody);
      msg.innerHTML = `신청이 저장되었습니다. 휴대폰 문자 앱으로 이동합니다.<br><a href="${smsHref}">문자 앱이 안 열리면 여기를 눌러주세요.</a>`;
      qs('.status-pill', panel).textContent = '신청완료';
      const index = LAST_SEARCH_RESULTS.findIndex((entry) => entry.id === bidder.id);
      if (index >= 0) LAST_SEARCH_RESULTS[index] = saved.bidder;
      CURRENT_BIDDER = saved.bidder;
    } catch (err) {
      msg.classList.add('err');
      msg.textContent = err.message;
    }
  });

  resultArea.appendChild(panel);
  window.scrollTo({ top: resultArea.offsetTop - 16, behavior: 'smooth' });
}

async function loadSettings() {
  SETTINGS = await api('/api/settings');
  document.title = `${SETTINGS.shopName || '렙타일갤러리'} 낙찰 결제/수령 신청`;
  qs('#shopTitle').textContent = SETTINGS.subtitle || '낙찰 결제 · 수령 신청';
  qs('#shopSubtitle').textContent = '성함과 연락처를 입력한 뒤 낙찰 개체별로 결제/수령 신청을 진행해 주세요.';
  qs('#noticeText').textContent = SETTINGS.notice || '';
  qs('#addressText').textContent = SETTINGS.shopAddress ? `매장 주소: ${SETTINGS.shopAddress}` : '';
  const lookupDays = Number(SETTINGS.userLookupDays || 7);
  const lookupNote = qs('#lookupNote');
  if (lookupNote) lookupNote.textContent = `신청 페이지 조회는 등록일 기준 ${lookupDays}일간 가능합니다. 기간이 지나면 매장으로 문의해 주세요.`;
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  const form = qs('#searchForm');
  const resultArea = qs('#resultArea');
  const emptyState = qs('#emptyState');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = qs('button', form);
    button.disabled = true;
    button.textContent = '조회 중...';
    resultArea.innerHTML = '';
    try {
      const name = qs('#nameInput').value.trim();
      const phone = qs('#phoneInput').value.trim();
      const data = await api(`/api/bidders/search?name=${encodeURIComponent(name)}&phone=${encodeURIComponent(phone)}`);
      if (!data.bidders.length) {
        LAST_SEARCH_RESULTS = [];
        emptyState.classList.remove('hidden');
        emptyState.innerHTML = '<div><div class="empty-icon">🔎</div><p>조회된 낙찰 내역이 없습니다.<br>성함 또는 연락처를 다시 확인해 주세요.</p></div>';
        resultArea.classList.add('hidden');
        return;
      }
      LAST_SEARCH_RESULTS = data.bidders;
      renderSearchResults(data.bidders);
    } catch (err) {
      LAST_SEARCH_RESULTS = [];
      emptyState.classList.remove('hidden');
      emptyState.innerHTML = `<div><div class="empty-icon">⚠️</div><p>${safeText(err.message)}</p></div>`;
      resultArea.classList.add('hidden');
    } finally {
      button.disabled = false;
      button.textContent = '조회하기';
    }
  });
});
