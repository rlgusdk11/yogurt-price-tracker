const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data.json');

function load() {
  if (!fs.existsSync(DATA_FILE)) {
    return { prices: [], subscriptions: [], config: {}, alertLog: [], nextId: 1 };
  }
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (err) {
    console.error('[db] data.json 파싱 실패, 새로 시작합니다:', err.message);
    return { prices: [], subscriptions: [], config: {}, alertLog: [], nextId: 1 };
  }
}

function save() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
}

const state = load();

function nowLocal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}:${pad(d.getSeconds())}`;
}

function getConfig(key, defaultValue = null) {
  return Object.prototype.hasOwnProperty.call(state.config, key) ? state.config[key] : defaultValue;
}

function setConfig(key, value) {
  state.config[key] = String(value);
  save();
}

function insertPrice({ source, productName, price, url, mallName }) {
  state.prices.push({
    id: state.nextId++,
    source,
    product_name: productName,
    price,
    url: url || null,
    mall_name: mallName || null,
    fetched_at: nowLocal(),
  });
  // 과도한 파일 크기 방지: 최근 2000건만 유지
  if (state.prices.length > 2000) {
    state.prices = state.prices.slice(state.prices.length - 2000);
  }
  save();
}

function getLatestPrices() {
  const byKey = new Map();
  for (const p of state.prices) {
    const key = p.source + '|' + (p.mall_name || '');
    const existing = byKey.get(key);
    if (!existing || p.fetched_at >= existing.fetched_at) {
      byKey.set(key, p);
    }
  }
  return [...byKey.values()].sort((a, b) => a.price - b.price);
}

function getPriceHistory(limit = 200) {
  return [...state.prices].sort((a, b) => (a.fetched_at < b.fetched_at ? 1 : -1)).slice(0, limit);
}

function addSubscription(sub) {
  const idx = state.subscriptions.findIndex((s) => s.endpoint === sub.endpoint);
  const record = { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth };
  if (idx >= 0) state.subscriptions[idx] = record;
  else state.subscriptions.push(record);
  save();
}

function removeSubscription(endpoint) {
  state.subscriptions = state.subscriptions.filter((s) => s.endpoint !== endpoint);
  save();
}

function getAllSubscriptions() {
  return state.subscriptions;
}

function logAlert(reason, price, source) {
  state.alertLog.push({ reason, price: price || null, source: source || null, sent_at: nowLocal() });
  if (state.alertLog.length > 500) {
    state.alertLog = state.alertLog.slice(state.alertLog.length - 500);
  }
  save();
}

module.exports = {
  getConfig,
  setConfig,
  insertPrice,
  getLatestPrices,
  getPriceHistory,
  addSubscription,
  removeSubscription,
  getAllSubscriptions,
  logAlert,
};
