// ========================================================
// 시나리오 3: 선착순 대기열O 부하 테스트 (2웨이브)
//
// Wave 1: VU 1~VU_COUNT — 대기열 → 신청 → 이탈/결제확정
// Wave 2: VU VU_COUNT+1~총VU — TTL 만료 대기 → 대기열 → 이탈 재고 재선점 → 전원 결제확정
//
// 핵심: 오버셀링 0건 + 이탈자 재고 재순환 검증 (대기열 경유)
// 실행: k6 run -e VU_COUNT=100 k6/scenarios/03-first-come-with-queue.js
// ========================================================

import http from 'k6/http';
import { check, sleep } from 'k6';
import exec from 'k6/execution';
import { Counter, Rate, Trend, Gauge } from 'k6/metrics';
import { batchLoginAll, authHeaders } from '../lib/auth.js';
import { setupTestData } from '../lib/setup.js';
import { assignPace } from '../lib/distribution.js';
import { withRetry } from '../lib/retry.js';
import { errorLog, resultLog } from '../lib/log.js';
import { buildSummaryOutput } from '../lib/report.js';
import {
  BASE_URL, VU_COUNT, EXTRA_VU_COUNT,
  RAMP_UP_SEC, HOLD_SEC, RAMP_DOWN_SEC,
  SETUP_TIMEOUT_SEC,
  QUEUE_POLL_INTERVAL_SEC, QUEUE_MAX_POLL_COUNT,
  PAYMENT_DROPOUT_RATIO, RETRY_MAX_ROUNDS, RETRY_WAIT_SEC, RETRY_DELAY_SEC,
} from '../lib/config.js';

const TOTAL_VUS = VU_COUNT + EXTRA_VU_COUNT;

// 커스텀 메트릭 (통일 네이밍)
const applyOk          = new Counter('apply_ok');
const applyDup         = new Counter('apply_dup');
const confirmOk        = new Counter('confirm_ok');
const paymentDropout   = new Counter('payment_dropout');
const wave2Ok          = new Counter('wave2_ok');
const soldOut          = new Counter('sold_out');
const unexpectedErr    = new Counter('unexpected_error');
const errorRate        = new Rate('error_rate');
const applyLatency     = new Trend('apply_latency');
// 병목(hold) 구간 응답시간: active VU가 target의 95% 이상일 때만 기록
const peakApplyLatency = new Trend('peak_apply_latency');
const queueWaitTime    = new Trend('queue_wait_time');

// 병목 판정 임계값 (TOTAL_VUS의 95%)
const PEAK_VU_THRESHOLD = Math.max(1, Math.floor(TOTAL_VUS * 0.95));
// 비즈니스 차단 카운터를 원인별로 분리 — 리포트에서 원인 분석 가능하도록 함
const blockedQueueDup          = new Counter('blocked_queue_dup');          // 409: 대기열 이미 진입 중
const blockedTokenExpired      = new Counter('blocked_token_expired');      // 429: passToken 만료
const blockedReservationExpired = new Counter('blocked_reservation_expired'); // 400 ENT_009: 예약 TTL 만료
const queuePass      = new Counter('queue_pass');
const queueTimeout   = new Counter('queue_timeout');
// 재고 검증 결과를 teardown에서 기록하여 통합 리포트에 포함시키기 위한 Gauge
const stockOverselling    = new Gauge('stock_overselling');      // 0 = 없음, 1 = 발생
const stockDbRedisMatch   = new Gauge('stock_db_redis_match');   // 0 = 불일치, 1 = 일치
const stockDbConfirmed    = new Gauge('stock_db_confirmed');     // DB 확정 건수
const stockRedisRemaining = new Gauge('stock_redis_remaining');  // Redis 잔여 건수

export const options = {
  setupTimeout: `${SETUP_TIMEOUT_SEC}s`,
  scenarios: {
    queue: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: `${RAMP_UP_SEC}s`, target: TOTAL_VUS },
        { duration: `${HOLD_SEC}s`, target: TOTAL_VUS },
        { duration: `${RAMP_DOWN_SEC}s`, target: 0 },
      ],
    },
  },
  thresholds: {
    'http_req_duration{name:queue_enter}': ['p(95)<3000'],
    'http_req_duration{name:queue_poll}':  ['p(95)<3000'],
    'http_req_duration{name:queue_apply}': ['p(95)<5000'],
    'queue_wait_time': ['p(95)<300000'],
  },
};

export function setup() {
  const testData = setupTestData('FIRST_COME_WITH_QUEUE');
  const tokens = batchLoginAll(TOTAL_VUS);
  console.log(`[setup] 2웨이브 구성 — Wave1: ${VU_COUNT}명, Wave2: ${EXTRA_VU_COUNT}명, 총 ${TOTAL_VUS}명`);
  return { tokens, eventIds: testData.eventIds, paceMap: testData.paceMap };
}

export default function (data) {
  if (__ITER > 0) {
    sleep(HOLD_SEC);
    return;
  }

  let totalRetries = 0;

  const token = data.tokens[String(__VU)];
  if (!token) {
    errorLog(__VU, '토큰 미획득, 건너뜀');
    return;
  }

  const isWave2 = __VU > VU_COUNT;
  const eventId = data.eventIds.FIRST_COME_WITH_QUEUE;
  const { courseId, paceId } = assignPace(__VU, data.paceMap[String(eventId)]);
  const headers = authHeaders(token);

  // Wave 2: TTL 만료 대기 후 시작
  if (isWave2) {
    sleep(RETRY_WAIT_SEC);
  }

  // 재고 조회
  const stockRes = http.get(
    `${BASE_URL}/main/events/${eventId}/entries/stock-check?paceId=${paceId}`,
    { headers, tags: { name: 'stock_check' } }
  );
  check(stockRes, {
    'stock-check 200': (r) => r.status === 200,
  });

  // 토큰 검증 (Wave 1만 — Wave 2는 스킵하여 시간 절약)
  if (!isWave2) {
    const noAuthEnterRes = http.post(
      `${BASE_URL}/queue/enter`,
      JSON.stringify({ paceId }),
      {
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer invalid-token' },
        tags: { name: 'neg_no_auth_queue' },
        responseCallback: http.expectedStatuses(401),
      }
    );
    check(noAuthEnterRes, { 'invalid JWT → queue 401': (r) => r.status === 401 });
  }

  // 대기열 진입 (최대 3회 재시도)
  const { res: enterRes, retries: enterRetries } = withRetry(
    () => http.post(
      `${BASE_URL}/queue/enter`,
      JSON.stringify({ paceId }),
      {
        headers,
        tags: { name: 'queue_enter' },
        responseCallback: http.expectedStatuses(200, 409),
      }
    ),
    { maxRetries: 3, backoffSec: 2, name: '대기열 진입', vu: __VU }
  );
  totalRetries += enterRetries;

  check(enterRes, { 'queue enter 200': (r) => r.status === 200 });

  // 409: QUEUE_ALREADY_ENTERED — 비즈니스 차단 (에러 아님)
  if (enterRes.status === 409) {
    blockedQueueDup.add(1);
    errorRate.add(false);
    resultLog(__VU, `대기열 진입 차단 — 이미 대기 중 (409)`);
    return;
  }
  if (enterRes.status !== 200) {
    unexpectedErr.add(1);
    errorRate.add(true);
    errorLog(__VU, `대기열 진입 실패 (${enterRes.status})`);
    return;
  }

  // 대기열 폴링 (PASS까지)
  const startWait = Date.now();
  let passed = false;
  let passToken = null;
  let pollCount = 0;

  // 서버 응답의 retryAfterMs 사용, 없으면 기존 클라이언트 jitter 폴백
  let retryAfterSec = QUEUE_POLL_INTERVAL_SEC * (0.8 + Math.random() * 0.4);

  for (let i = 0; i < QUEUE_MAX_POLL_COUNT; i++) {
    sleep(retryAfterSec);
    pollCount++;

    const statusRes = http.get(
      `${BASE_URL}/queue/status?paceId=${paceId}`,
      { headers, tags: { name: 'queue_poll' } }
    );

    if (statusRes.status === 200) {
      try {
        const body = statusRes.json();
        if (body.data && body.data.status === 'PASS') {
          passed = true;
          passToken = body.data.passToken;
          queueWaitTime.add(Date.now() - startWait);
          queuePass.add(1);
          break;
        }
        // 서버가 retryAfterMs를 내려주면 사용, 아니면 클라이언트 jitter 유지
        if (body.data && body.data.retryAfterMs) {
          retryAfterSec = body.data.retryAfterMs / 1000;
        }
      } catch (e) { /* 다음 폴링 계속 */ }
    }
  }

  if (!passed) {
    queueTimeout.add(1);
    errorRate.add(true);
    errorLog(__VU, `대기열 타임아웃 (${pollCount}회 폴링)`);
    return;
  }

  // 대기열 토큰 검증 (Wave 1만)
  if (!isWave2) {
    const noQueueTokenRes = http.post(
      `${BASE_URL}/main/events/${eventId}/entries/apply/first-come`,
      JSON.stringify({ courseId, paceId }),
      {
        headers,
        tags: { name: 'neg_no_queue_token' },
        responseCallback: http.expectedStatuses(429),
      }
    );
    check(noQueueTokenRes, { 'no queue token → 429': (r) => r.status === 429 });
  }

  // ── 선착순 신청 + 결제 루프 ──
  const applyHeaders = Object.assign({}, headers, { 'X-Queue-Token': passToken });

  for (let round = 0; round <= RETRY_MAX_ROUNDS; round++) {
    if (round > 0) sleep(RETRY_DELAY_SEC);

    const start = Date.now();
    const { res: applyRes, retries: applyRetries } = withRetry(
      () => http.post(
        `${BASE_URL}/main/events/${eventId}/entries/apply/first-come`,
        JSON.stringify({ courseId, paceId }),
        {
          headers: applyHeaders,
          tags: { name: 'queue_apply' },
          responseCallback: http.expectedStatuses(200, 400, 409, 429),
        }
      ),
      { maxRetries: 1, backoffSec: 2, name: '선착순 신청', vu: __VU }
    );
    const elapsed = Date.now() - start;
    applyLatency.add(elapsed);
    if (exec.instance.vusActive >= PEAK_VU_THRESHOLD) {
      peakApplyLatency.add(elapsed);
    }
    totalRetries += applyRetries;

    // 429: passToken 만료 — 비즈니스 차단 (에러 아님)
    if (applyRes.status === 429) {
      blockedTokenExpired.add(1);
      errorRate.add(false);
      resultLog(__VU, `passToken 만료 차단 (429, 라운드 ${round})`);
      break;
    }

    if (applyRes.status === 200) {
      applyOk.add(1);
      errorRate.add(false);

      // Wave 1: 이탈/확정 판단 / Wave 2: 전원 결제확정
      if (!isWave2 && Math.random() < PAYMENT_DROPOUT_RATIO) {
        paymentDropout.add(1);
        resultLog(__VU, `결제 이탈 (라운드 ${round})`, totalRetries);
        break;
      }

      const confirmRes = http.post(
        `${BASE_URL}/main/internal/load-test/confirm-reservation`,
        JSON.stringify({ paceId }),
        { headers, tags: { name: 'confirm_reservation' } }
      );

      if (confirmRes.status === 200) {
        if (isWave2) {
          wave2Ok.add(1);
          resultLog(__VU, `Wave2 결제 확정 (라운드 ${round})`, totalRetries);
        } else {
          confirmOk.add(1);
          resultLog(__VU, `Wave1 결제 확정 (라운드 ${round})`, totalRetries);
        }
      } else if (confirmRes.status === 400) {
        // ENT_009: 예약 TTL 만료 / ENT_007: 신청 불가 상태 — 비즈니스 차단 (에러 아님)
        blockedReservationExpired.add(1);
        errorRate.add(false);
        resultLog(__VU, `예약 만료 차단 (${confirmRes.status}, 라운드 ${round})`);
      } else {
        unexpectedErr.add(1);
        errorRate.add(true);
        errorLog(__VU, `결제 확정 실패 (${confirmRes.status}, 라운드 ${round})`);
      }
      break;

    } else if (applyRes.status === 409) {
      applyDup.add(1);
      errorRate.add(false);
      try {
        const code = applyRes.json().code;
        if (round === RETRY_MAX_ROUNDS) {
          soldOut.add(1);
          resultLog(__VU, `최종 매진 (${code})`, totalRetries);
        }
      } catch (e) {
        if (round === RETRY_MAX_ROUNDS) {
          soldOut.add(1);
          resultLog(__VU, '최종 매진 (409)', totalRetries);
        }
      }

    } else if (applyRes.status === 400) {
      applyDup.add(1);
      errorRate.add(false);

    } else {
      unexpectedErr.add(1);
      errorRate.add(true);
      errorLog(__VU, `예상 외 에러 (${applyRes.status}, 라운드 ${round})`);
      break;
    }
  }
}

// ── teardown: 재고 검증 리포트 ──
export function teardown(data) {
  const eventId = data.eventIds.FIRST_COME_WITH_QUEUE;
  const token = data.tokens['1'];
  if (!token) {
    console.error('[teardown] 토큰 없음, 검증 스킵');
    return;
  }

  const res = http.get(
    `${BASE_URL}/main/internal/load-test/stock-summary?eventId=${eventId}`,
    { headers: authHeaders(token), tags: { name: 'stock_summary' } }
  );

  if (res.status !== 200) {
    console.error(`[teardown] 재고 검증 API 실패: ${res.status}`);
    return;
  }

  const s = res.json().data;

  // 통합 리포트(handleSummary)에서 사용하도록 Gauge로 기록
  stockOverselling.add(s.overselling ? 1 : 0);
  stockDbRedisMatch.add(s.dbRedisMatch ? 1 : 0);
  stockDbConfirmed.add(s.dbConfirmedStock);
  stockRedisRemaining.add(s.redisRemainingStock);

  console.log('');
  console.log('========================================');
  console.log('         재고 검증 리포트');
  console.log('========================================');
  console.log(`이벤트 ID: ${s.eventId}`);
  console.log('');
  console.log(`[DB]    총 재고: ${s.dbTotalStock}  |  확정: ${s.dbConfirmedStock}`);
  console.log(`[Redis] 잔여:   ${s.redisRemainingStock}  |  확정: ${s.redisConfirmedStock}`);
  console.log(`[Entry] PRE_SAVED: ${s.entryPreSavedCount}  |  RESERVED: ${s.entryReservedCount}  |  APPLIED: ${s.entryAppliedCount}`);
  console.log('');
  console.log(`오버셀링:     ${s.overselling ? '!! 발생 !!' : '없음 (OK)'}`);
  console.log(`DB-Redis 일치: ${s.dbRedisMatch ? '일치 (OK)' : '!! 불일치 !!'}`);
  console.log('');
  console.log('코스/페이스         | DB재고 | DB확정 | R잔여 | R확정 | 일치');
  console.log('--------------------+--------+--------+-------+-------+-----');
  for (const p of s.paceDetails) {
    const label = `${p.courseName}/${p.paceName}`.padEnd(18);
    const t = String(p.dbTotal).padStart(6);
    const c = String(p.dbConfirmed).padStart(6);
    const rr = String(p.redisRemaining).padStart(5);
    const rc = String(p.redisConfirmed).padStart(5);
    const m = p.match ? ' OK ' : ' !! ';
    console.log(`${label} | ${t} | ${c} | ${rr} | ${rc} | ${m}`);
  }
  console.log('========================================');
  console.log('');
}

// ── handleSummary: 통합 리포트 출력 ──
export function handleSummary(data) {
  return buildSummaryOutput(data, {
    testType: 'LOAD',
    flow: 'FIRST_COME_QUEUE',
    vuCount: TOTAL_VUS,
  });
}
