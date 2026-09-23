const cron = require('node-cron');
const { runPriceCheck } = require('./priceCheck');

/**
 * 하루 3번(09:00, 13:00, 20:00) 정기 요약 알림 + 30분마다 임계값 감시.
 * 크론 시간대는 서버 로컬 시간 기준이며, TZ 환경변수로 조정 가능.
 */
function startScheduler() {
  const summaryTimes = (process.env.SUMMARY_CRON_TIMES || '0 9,13,20 * * *').split('|');

  summaryTimes.forEach((expr) => {
    cron.schedule(expr.trim(), () => {
      console.log('[scheduler] 정기 요약 조회 실행:', new Date().toLocaleString());
      runPriceCheck('summary').catch((err) => console.error('[scheduler] 요약 조회 실패:', err));
    });
  });

  const checkInterval = process.env.THRESHOLD_CHECK_CRON || '*/30 * * * *';
  cron.schedule(checkInterval, () => {
    runPriceCheck('check').catch((err) => console.error('[scheduler] 임계값 조회 실패:', err));
  });

  console.log('[scheduler] 하루 3번 요약 알림:', summaryTimes.join(', '));
  console.log('[scheduler] 목표가 감시 주기:', checkInterval);
}

module.exports = { startScheduler };
