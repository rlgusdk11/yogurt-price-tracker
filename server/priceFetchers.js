const axios = require('axios');

const SEARCH_QUERY = process.env.SEARCH_QUERY || '서울우유 그릭요거트';

// Strip HTML tags Naver puts in titles (e.g. <b>서울우유</b>)
function stripTags(str) {
  return String(str || '').replace(/<[^>]*>/g, '');
}

/**
 * 네이버쇼핑 검색 API (공식, 무료 발급)
 * https://developers.naver.com/docs/serviceapi/search/shopping/shopping.md
 * .env 에 NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 필요
 */
async function fetchNaverShoppingPrices() {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.warn('[naver] NAVER_CLIENT_ID/SECRET 이 설정되지 않아 네이버쇼핑 조회를 건너뜁니다.');
    return [];
  }

  const res = await axios.get('https://openapi.naver.com/v1/search/shop.json', {
    params: {
      query: SEARCH_QUERY,
      display: 20,
      sort: 'asc', // 가격 낮은순
    },
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
    timeout: 10000,
  });

  const items = res.data.items || [];
  return items.map((item) => ({
    source: 'naver',
    productName: stripTags(item.title),
    price: Number(item.lprice),
    url: item.link,
    mallName: item.mallName,
  }));
}

/**
 * 쿠팡 검색 결과 - 공식 오픈API가 없어(쿠팡파트너스는 제휴링크 생성용) 모바일 검색 페이지의
 * 내부 JSON 엔드포인트를 best-effort 로 호출합니다.
 * 쿠팡이 구조/차단 정책을 바꾸면 이 함수는 실패할 수 있고, 실패해도 앱 전체는 계속 동작합니다
 * (네이버쇼핑 결과만으로도 비교는 가능). 쿠팡 이용약관상 자동화된 수집은 제한될 수 있으니
 * 요청 빈도를 낮게 유지하세요 (기본: 하루 3회 스케줄에 맞춰서만 호출).
 */
async function fetchCoupangPrices() {
  try {
    const res = await axios.get('https://www.coupang.com/np/search', {
      params: { q: SEARCH_QUERY, channel: 'user' },
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        Accept: 'text/html',
      },
      timeout: 10000,
    });

    const html = res.data;
    // 검색 결과 카드에서 상품명/가격을 정규식으로 추출 (쿠팡이 마크업을 바꾸면 깨질 수 있음)
    const results = [];
    const priceRegex = /class="price-value">([\d,]+)<\/strong>/g;
    const nameRegex = /class="name">([^<]+)<\/div>/g;

    const names = [];
    let m;
    while ((m = nameRegex.exec(html)) !== null) names.push(stripTags(m[1]));
    const prices = [];
    while ((m = priceRegex.exec(html)) !== null) prices.push(Number(m[1].replace(/,/g, '')));

    const count = Math.min(names.length, prices.length, 20);
    for (let i = 0; i < count; i++) {
      results.push({
        source: 'coupang',
        productName: names[i],
        price: prices[i],
        url: 'https://www.coupang.com/np/search?q=' + encodeURIComponent(SEARCH_QUERY),
        mallName: '쿠팡',
      });
    }
    return results;
  } catch (err) {
    console.warn('[coupang] 크롤링 실패 (차단/구조변경 가능성):', err.message);
    return [];
  }
}

/**
 * 관련 없는 검색결과(그릭요거트가 아닌 다른 유제품 등)를 걸러내기 위한 간단한 필터.
 */
function isRelevant(item) {
  const name = item.productName.toLowerCase();
  return name.includes('그릭') && name.includes('요거트') || name.includes('그릭요거트');
}

async function fetchAllPrices() {
  const [naverResults, coupangResults] = await Promise.all([
    fetchNaverShoppingPrices().catch((err) => {
      console.warn('[naver] 조회 실패:', err.message);
      return [];
    }),
    fetchCoupangPrices(),
  ]);

  const all = [...naverResults, ...coupangResults].filter(isRelevant);
  return all;
}

module.exports = { fetchAllPrices, fetchNaverShoppingPrices, fetchCoupangPrices, SEARCH_QUERY };
