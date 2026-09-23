require('dotenv').config();
const path = require('path');
const express = require('express');

const {
  getConfig,
  setConfig,
  getLatestPrices,
  getPriceHistory,
  addSubscription,
  removeSubscription,
} = require('./db');
const { configureWebPush } = require('./push');
const { startScheduler } = require('./scheduler');
const { runPriceCheck } = require('./priceCheck');
const { SEARCH_QUERY } = require('./priceFetchers');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

const pushEnabled = configureWebPush();

app.get('/api/vapid-public-key', (req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY || null, enabled: pushEnabled });
});

app.get('/api/prices', (req, res) => {
  res.json({
    query: SEARCH_QUERY,
    latest: getLatestPrices(),
    history: getPriceHistory(100),
    threshold: Number(getConfig('threshold_price', '0')) || null,
  });
});

app.post('/api/threshold', (req, res) => {
  const { price } = req.body;
  if (!Number.isFinite(price) || price < 0) {
    return res.status(400).json({ error: 'invalid price' });
  }
  setConfig('threshold_price', price);
  res.json({ ok: true, threshold: price });
});

app.post('/api/subscribe', (req, res) => {
  const sub = req.body;
  if (!sub || !sub.endpoint || !sub.keys) {
    return res.status(400).json({ error: 'invalid subscription' });
  }
  addSubscription(sub);
  res.json({ ok: true });
});

app.post('/api/unsubscribe', (req, res) => {
  const { endpoint } = req.body;
  if (endpoint) removeSubscription(endpoint);
  res.json({ ok: true });
});

// 즉시 한번 조회해보고 싶을 때 (버튼/테스트용)
app.post('/api/fetch-now', async (req, res) => {
  try {
    const result = await runPriceCheck('check');
    res.json({ ok: true, lowest: result.lowest, count: result.results.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[server] http://localhost:${PORT} 에서 실행중`);
  startScheduler();
});
