const { fetchAllPrices } = require('./priceFetchers');
const { insertPrice, getConfig, logAlert } = require('./db');
const { sendPushToAll } = require('./push');

/**
 * 가격을 수집해서 DB에 저장하고, 필요하면 푸시알림을 보낸다.
 * @param {'summary'|'check'} reason - 'summary'는 하루 3번 정기 요약, 'check'는 임계값 감시용 조회
 */
async function runPriceCheck(reason = 'check') {
  const results = await fetchAllPrices();

  if (results.length === 0) {
    console.warn('[priceCheck] 조회된 상품이 없습니다 (API 키 미설정 또는 검색결과 없음).');
    return { results, lowest: null };
  }

  for (const item of results) {
    insertPrice(item);
  }

  const lowest = results.reduce((min, cur) => (cur.price < min.price ? cur : min));
  const threshold = Number(getConfig('threshold_price', '0')) || null;

  if (reason === 'summary') {
    await sendPushToAll({
      title: '서울우유 그릭요거트 최저가',
      body: `오늘 최저가: ${lowest.price.toLocaleString()}원 (${lowest.mallName || lowest.source})`,
      url: lowest.url,
    });
    logAlert('summary', lowest.price, lowest.source);
  } else if (threshold && lowest.price <= threshold) {
    await sendPushToAll({
      title: '🔔 목표가 이하로 떨어졌어요!',
      body: `${lowest.price.toLocaleString()}원 (${lowest.mallName || lowest.source}) - 목표가 ${threshold.toLocaleString()}원`,
      url: lowest.url,
    });
    logAlert('threshold', lowest.price, lowest.source);
  }

  return { results, lowest };
}

module.exports = { runPriceCheck };
