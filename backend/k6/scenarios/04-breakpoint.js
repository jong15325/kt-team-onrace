// ========================================================
// 시나리오 4: 용량(Breakpoint) 테스트
//
// 목적: 서버 스펙의 안정 한계를 자동으로 탐지
// 방식: 계단형 VU 증가 (Staircase) → 한계점 도달 시 자동 중단
// 흐름: LOTTERY / FIRST_COME / FIRST_COME_QUEUE 선택 가능
//
// 실행 예시:
//   k6 run k6/scenarios/04-breakpoint.js
//   k6 run -e BP_SCENARIO_FLOW=FIRST_COME -e TOTAL_STOCK=999999 k6/scenarios/04-breakpoint.js
//   k6 run -e BP_START_VUS=100 -e BP_STEP_VUS=100 -e BP_MAX_VUS=1000 k6/scenarios/04-breakpoint.js
// ========================================================

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter, Gauge } from 'k6/metrics';
import { batchLoginAll, authHeaders } from '../lib/auth.js';
import { setupTestData } from '../lib/setup.js';
import { assignPace } from '../lib/distribution.js';
import { withRetry } from '../lib/retry.js';
import { errorLog } from '../lib/log.js';
import { buildSummaryOutput } from '../lib/report.js';
import {
  BASE_URL, SETUP_TIMEOUT_SEC,
  QUEUE_POLL_INTERVAL_SEC, QUEUE_MAX_POLL_COUNT,
  BP_START_VUS, BP_STEP_VUS, BP_MAX_VUS,
  BP_STEP_DURATION_SEC, BP_RAMP_SEC,
  BP_ERROR_THRESHOLD, BP_P95_THRESHOLD_MS,
  BP_SCENARIO_FLOW, BP_LOGIN_POOL,
  HOT_PACE_RATIO,
} from '../lib/config.js';
import {
  generateStaircaseStages,
} from '../lib/breakpoint.js';

// ── 시나리오 타입 매핑 ──
const FLOW_MAP = {
  LOTTERY:            'LOTTERY',
  FIRST_COME:         'FIRST_COME_NO_QUEUE',
  FIRST_COME_QUEUE:   'FIRST_COME_WITH_QUEUE',
};

// ── 커스텀 메트릭 (통일 네이밍) ──
const applyLatency   = new Trend('apply_latency');
const errorRate      = new Rate('error_rate');
const applyOk        = new Counter('apply_ok');
const applyDup       = new Counter('apply_dup');
const confirmOk      = new Counter('confirm_ok');
const unexpectedErr  = new Counter('unexpected_error');
// 비즈니스 차단 카운터를 원인별로 분리 — FIRST_COME_QUEUE 플로우 전용
const blockedQueueDup     = new Counter('blocked_queue_dup');     // 409: 대기열 이미 진입
const blockedTokenExpired = new Counter('blocked_token_expired'); // 429: passToken 만료
const queuePass      = new Counter('queue_pass');
const queueTimeout   = new Counter('queue_timeout');
// 재고 검증 결과 Gauge (teardown에서 기록) — FIRST_COME / FIRST_COME_QUEUE 전용
const stockOverselling    = new Gauge('stock_overselling');
const stockDbRedisMatch   = new Gauge('stock_db_redis_match');
const stockDbConfirmed    = new Gauge('stock_db_confirmed');
const stockRedisRemaining = new Gauge('stock_redis_remaining');

// ── 동적 stages 생성 ──
const stages = generateStaircaseStages(
  BP_START_VUS, BP_STEP_VUS, BP_MAX_VUS,
  BP_STEP_DURATION_SEC, BP_RAMP_SEC
);

export const options = {
  setupTimeout: `${SETUP_TIMEOUT_SEC}s`,
  scenarios: {
    breakpoint: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: stages,
      gracefulRampDown: '30s',
      gracefulStop: '30s',
    },
  },
  thresholds: {
    // 에러율 초과 시 자동 중단
    error_rate: [{
      threshold: `rate<${BP_ERROR_THRESHOLD}`,
      abortOnFail: true,
      delayAbortEval: '30s',
    }],
    // p95 응답시간 초과 시 자동 중단
    apply_latency: [{
      threshold: `p(95)<${BP_P95_THRESHOLD_MS}`,
      abortOnFail: true,
      delayAbortEval: '30s',
    }],
  },
};

// ================================================================
// setup: 데이터 셋업 + 일괄 로그인
// ================================================================

export function setup() {
  const scenarioType = FLOW_MAP[BP_SCENARIO_FLOW];
  if (!scenarioType) {
    throw new Error(`지원하지 않는 BP_SCENARIO_FLOW: ${BP_SCENARIO_FLOW} (LOTTERY / FIRST_COME / FIRST_COME_QUEUE)`);
  }

  console.log(`[breakpoint] 용량 테스트 시작 — 흐름: ${BP_SCENARIO_FLOW}, VU: ${BP_START_VUS}→${BP_MAX_VUS} (step ${BP_STEP_VUS}), 로그인풀: ${BP_LOGIN_POOL}명, 단계유지: ${BP_STEP_DURATION_SEC}초`);

  // 데이터 셋업
  const testData = setupTestData(scenarioType);

  // 로그인 풀: BP_MAX_VUS가 아닌 BP_LOGIN_POOL(기본 30,000)명 로그인
  // 각 VU 반복마다 다른 유저를 사용하여 실제 쓰기(INSERT) 부하 유지
  const tokens = batchLoginAll(BP_LOGIN_POOL);
  const loginCount = Object.keys(tokens).length;

  // 페이스 목록 (HOT / 나머지 분리 — 70/30 배분용)
  const eventKey = Object.keys(testData.eventIds)[0];
  const eventId = testData.eventIds[eventKey];
  const paceMapEntry = testData.paceMap[String(eventId)];
  const hotPaces = paceMapEntry.hot;
  const otherPaces = paceMapEntry.others;
  const totalPaceCount = hotPaces.length + otherPaces.length;

  console.log(`[breakpoint] 셋업 완료 — eventId=${eventId}, 로그인풀=${loginCount}명 (동시VU 최대=${BP_MAX_VUS}), 페이스=${totalPaceCount}개`);
  console.log(`[breakpoint] 페이스 배분 — HOT ${hotPaces.length}개 (VU ${Math.round(HOT_PACE_RATIO * 100)}%), 나머지 ${otherPaces.length}개 (VU ${Math.round((1 - HOT_PACE_RATIO) * 100)}%)`);

  return {
    tokens,
    loginCount,
    eventId,
    paceMapEntry: { hot: hotPaces, others: otherPaces },
    flow: BP_SCENARIO_FLOW,
    testStartMs: Date.now(),
  };
}

// ================================================================
// VU 기본 함수: 연속 반복, 유저 토큰 순환
// ================================================================

export default function (data) {
  // 유저 토큰 순환: 각 반복마다 다른 유저 사용 (소수 배수로 골고루 분산)
  const vuIdx = ((__VU - 1) + __ITER * 7919) % data.loginCount + 1;
  const token = data.tokens[String(vuIdx)];

  if (!token) {
    errorRate.add(true);
    return;
  }

  const headers = authHeaders(token);

  // 70/30 페이스 배분: assignPace 공통 로직 사용 (10-VU 블록 인터리브)
  const { courseId, paceId } = assignPace(__VU, data.paceMapEntry);
  const eventId = data.eventId;

  // 플로우 분기
  switch (data.flow) {
    case 'LOTTERY':
      doLottery(eventId, courseId, paceId, headers);
      break;
    case 'FIRST_COME':
      doFirstCome(eventId, courseId, paceId, headers);
      break;
    case 'FIRST_COME_QUEUE':
      doFirstComeQueue(eventId, courseId, paceId, headers);
      break;
  }
}

// ================================================================
// 플로우 1: 응모 (LOTTERY)
// ================================================================

function doLottery(eventId, courseId, paceId, headers) {
  // 재고 조회
  http.get(
    `${BASE_URL}/main/events/${eventId}/entries/stock-check?paceId=${paceId}`,
    { headers, tags: { name: 'bp_stock_check' } }
  );

  // 응모 신청
  const start = Date.now();
  const res = http.post(
    `${BASE_URL}/main/events/${eventId}/entries/apply/lottery`,
    JSON.stringify({ courseId, paceId }),
    {
      headers,
      tags: { name: 'bp_apply' },
      responseCallback: http.expectedStatuses(200, 400, 409),
    }
  );
  const elapsed = Date.now() - start;

  applyLatency.add(elapsed);
  recordResult(res);
}

// ================================================================
// 플로우 2: 선착순 대기열X (FIRST_COME)
// ================================================================

function doFirstCome(eventId, courseId, paceId, headers) {
  // 재고 조회
  http.get(
    `${BASE_URL}/main/events/${eventId}/entries/stock-check?paceId=${paceId}`,
    { headers, tags: { name: 'bp_stock_check' } }
  );

  // 선착순 신청
  const start = Date.now();
  const res = http.post(
    `${BASE_URL}/main/events/${eventId}/entries/apply/first-come`,
    JSON.stringify({ courseId, paceId }),
    {
      headers,
      tags: { name: 'bp_apply' },
      responseCallback: http.expectedStatuses(200, 400, 409),
    }
  );
  const elapsed = Date.now() - start;

  applyLatency.add(elapsed);

  if (res.status === 200) {
    applyOk.add(1);
    errorRate.add(false);

    // 결제 확정
    const confirmRes = http.post(
      `${BASE_URL}/main/internal/load-test/confirm-reservation`,
      JSON.stringify({ paceId }),
      { headers, tags: { name: 'bp_confirm' } }
    );

    if (confirmRes.status === 200) {
      confirmOk.add(1);
    } else {
      unexpectedErr.add(1);
      errorRate.add(true);
      errorLog(__VU, `결제 확정 실패 (${confirmRes.status})`);
    }
  } else if (res.status === 409 || res.status === 400) {
    applyDup.add(1);
    errorRate.add(false);
  } else {
    unexpectedErr.add(1);
    errorRate.add(true);
    errorLog(__VU, `선착순 신청 실패 (${res.status})`);
  }
}

// ================================================================
// 플로우 3: 선착순 대기열O (FIRST_COME_QUEUE)
// ================================================================

function doFirstComeQueue(eventId, courseId, paceId, headers) {
  // 대기열 진입
  const { res: enterRes } = withRetry(
    () => http.post(
      `${BASE_URL}/queue/enter`,
      JSON.stringify({ paceId }),
      {
        headers,
        tags: { name: 'bp_queue_enter' },
        responseCallback: http.expectedStatuses(200, 409),
      }
    ),
    { maxRetries: 2, backoffSec: 2, name: '대기열 진입', vu: __VU }
  );

  // 409: QUEUE_ALREADY_ENTERED — 비즈니스 차단 (에러 아님)
  if (enterRes.status === 409) {
    blockedQueueDup.add(1);
    errorRate.add(false);
    return;
  }
  if (enterRes.status !== 200) {
    unexpectedErr.add(1);
    errorRate.add(true);
    errorLog(__VU, `대기열 진입 실패 (${enterRes.status})`);
    return;
  }

  // 대기열 폴링 (PASS까지)
  let passed = false;
  let passToken = null;

  for (let i = 0; i < QUEUE_MAX_POLL_COUNT; i++) {
    // ±20% jitter: 폴링 동시 집중(micro-burst) 방지
    sleep(QUEUE_POLL_INTERVAL_SEC * (0.8 + Math.random() * 0.4));

    const statusRes = http.get(
      `${BASE_URL}/queue/status?paceId=${paceId}`,
      { headers, tags: { name: 'bp_queue_poll' } }
    );

    if (statusRes.status === 200) {
      try {
        const body = statusRes.json();
        if (body.data && body.data.status === 'PASS') {
          passed = true;
          passToken = body.data.passToken;
          queuePass.add(1);
          break;
        }
      } catch (_) { /* 다음 폴링 계속 */ }
    }
  }

  if (!passed) {
    queueTimeout.add(1);
    errorRate.add(true);
    errorLog(__VU, '대기열 타임아웃');
    return;
  }

  // 선착순 신청 (passToken 포함)
  const applyHeaders = Object.assign({}, headers, { 'X-Queue-Token': passToken });
  const start = Date.now();
  const applyRes = http.post(
    `${BASE_URL}/main/events/${eventId}/entries/apply/first-come`,
    JSON.stringify({ courseId, paceId }),
    {
      headers: applyHeaders,
      tags: { name: 'bp_apply' },
      responseCallback: http.expectedStatuses(200, 400, 409, 429),
    }
  );
  const elapsed = Date.now() - start;

  applyLatency.add(elapsed);

  if (applyRes.status === 200) {
    applyOk.add(1);
    errorRate.add(false);

    // 결제 확정
    const confirmRes = http.post(
      `${BASE_URL}/main/internal/load-test/confirm-reservation`,
      JSON.stringify({ paceId }),
      { headers, tags: { name: 'bp_confirm' } }
    );
    if (confirmRes.status === 200) {
      confirmOk.add(1);
    } else {
      unexpectedErr.add(1);
      errorRate.add(true);
      errorLog(__VU, `결제 확정 실패 (${confirmRes.status})`);
    }
  } else if (applyRes.status === 429) {
    // passToken 만료 — 비즈니스 차단 (에러 아님)
    blockedTokenExpired.add(1);
    errorRate.add(false);
  } else if (applyRes.status === 409 || applyRes.status === 400) {
    applyDup.add(1);
    errorRate.add(false);
  } else {
    unexpectedErr.add(1);
    errorRate.add(true);
    errorLog(__VU, `선착순 신청 실패 (${applyRes.status})`);
  }
}

// ================================================================
// 공통: 결과 기록 (LOTTERY용)
// ================================================================

function recordResult(res) {
  if (res.status === 200) {
    applyOk.add(1);
    errorRate.add(false);
  } else if (res.status === 400 || res.status === 409) {
    applyDup.add(1);
    errorRate.add(false);
  } else {
    unexpectedErr.add(1);
    errorRate.add(true);
    errorLog(__VU, `응모 실패 (${res.status})`);
  }
}

// ================================================================
// teardown: 재고 검증 리포트 (FIRST_COME / FIRST_COME_QUEUE만)
// ================================================================

export function teardown(data) {
  // LOTTERY는 재고 소진 개념이 없으므로 스킵
  if (data.flow === 'LOTTERY') return;

  const token = data.tokens['1'];
  if (!token) {
    console.error('[teardown] 토큰 없음, 검증 스킵');
    return;
  }

  const res = http.get(
    `${BASE_URL}/main/internal/load-test/stock-summary?eventId=${data.eventId}`,
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

// ================================================================
// handleSummary: 통합 리포트 출력
// ================================================================

export function handleSummary(data) {
  return buildSummaryOutput(data, {
    testType: 'BREAKPOINT',
    flow: BP_SCENARIO_FLOW,
    startVUs: BP_START_VUS,
    stepVUs: BP_STEP_VUS,
    maxVUs: BP_MAX_VUS,
    stepDurationSec: BP_STEP_DURATION_SEC,
    rampSec: BP_RAMP_SEC,
    errorThreshold: BP_ERROR_THRESHOLD,
    p95ThresholdMs: BP_P95_THRESHOLD_MS,
    loginPool: BP_LOGIN_POOL,
  });
}
