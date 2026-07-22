const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'rg2026!';
const APP_VERSION = 'v30-csv-import';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
console.log(`데이터 저장 위치: ${DB_PATH}`);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

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

app.get('/health', (req, res) => res.json({ ok: true, version: APP_VERSION, dbPath: DB_PATH }));
app.get('/api/version', (req, res) => res.json({ version: APP_VERSION, dbPath: DB_PATH }));

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
