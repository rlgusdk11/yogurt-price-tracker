require('dotenv').config();
const { fetchAllPrices } = require('./priceFetchers');

(async () => {
  const results = await fetchAllPrices();
  console.log(`총 ${results.length}건 조회됨:\n`);
  results
    .sort((a, b) => a.price - b.price)
    .forEach((r) => {
      console.log(`[${r.source}] ${r.price.toLocaleString()}원 - ${r.productName} (${r.mallName || ''})`);
    });
})();
