// ========================================================
// 시나리오 1: 응모신청 부하 테스트
//
// 흐름: [setup] 데이터 셋업 → 일괄 로그인 → [VU] 응모신청 (1회)
// 재시도: 5xx 에러 시 1회 재시도
// 기대: 전원 신청 성공 (재고 제한 없음)
// 실행: k6 run -e VU_COUNT=100 k6/scenarios/01-lottery.js
// ========================================================

import http from 'k6/http';
import { check, sleep } from 'k6';
import exec from 'k6/execution';
import { Counter, Rate, Trend } from 'k6/metrics';
import { batchLoginAll, authHeaders } from '../lib/auth.js';
import { setupTestData } from '../lib/setup.js';
import { assignPace } from '../lib/distribution.js';
import { withRetry } from '../lib/retry.js';
import { errorLog, resultLog } from '../lib/log.js';
import { buildSummaryOutput } from '../lib/report.js';
import {
  BASE_URL, VU_COUNT,
  RAMP_UP_SEC, HOLD_SEC, RAMP_DOWN_SEC,
  SETUP_TIMEOUT_SEC,
} from '../lib/config.js';

// 커스텀 메트릭 (통일 네이밍)
const applyOk          = new Counter('apply_ok');
const applyDup         = new Counter('apply_dup');
const unexpectedErr    = new Counter('unexpected_error');
const errorRate        = new Rate('error_rate');
const applyLatency     = new Trend('apply_latency');
// 병목(hold) 구간 응답시간: active VU가 target의 95% 이상일 때만 기록
// → ramp-up 초반/ramp-down 말미의 저부하 샘플을 자동 제외
const peakApplyLatency = new Trend('peak_apply_latency');

// 병목 판정 임계값 (target VU의 95%)
const PEAK_VU_THRESHOLD = Math.max(1, Math.floor(VU_COUNT * 0.95));

export const options = {
  setupTimeout: `${SETUP_TIMEOUT_SEC}s`,
  scenarios: {
    lottery: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: `${RAMP_UP_SEC}s`, target: VU_COUNT },
        { duration: `${HOLD_SEC}s`, target: VU_COUNT },
        { duration: `${RAMP_DOWN_SEC}s`, target: 0 },
      ],
    },
  },
  thresholds: {
    'http_req_duration{name:lottery_apply}': ['p(95)<3000'],
    http_req_failed: ['rate<0.01'],
  },
};

// ── setup: 데이터 셋업 → 일괄 사전 로그인 ──
export function setup() {
  const testData = setupTestData('LOTTERY');
  const tokens = batchLoginAll(VU_COUNT);
  return { tokens, eventIds: testData.eventIds, paceMap: testData.paceMap };
}

export default function (data) {
  if (__ITER > 0) {
    sleep(HOLD_SEC);
    return;
  }

  const token = data.tokens[String(__VU)];
  if (!token) {
    errorLog(__VU, '토큰 미획득, 건너뜀');
    return;
  }

  const eventId = data.eventIds.LOTTERY;
  const { courseId, paceId } = assignPace(__VU, data.paceMap[String(eventId)]);
  const headers = authHeaders(token);

  // 재고 조회
  const stockRes = http.get(
    `${BASE_URL}/main/events/${eventId}/entries/stock-check?paceId=${paceId}`,
    { headers, tags: { name: 'stock_check' } }
  );
  check(stockRes, {
    'stock-check 200': (r) => r.status === 200,
  });

  // 토큰 검증 (네거티브 테스트)
  const noAuthRes = http.post(
    `${BASE_URL}/main/events/${eventId}/entries/apply/lottery`,
    JSON.stringify({ courseId, paceId }),
    {
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer invalid-token' },
      tags: { name: 'neg_no_auth' },
      responseCallback: http.expectedStatuses(401),
    }
  );
  check(noAuthRes, { 'invalid JWT → 401': (r) => r.status === 401 });

  // 응모 신청
  const start = Date.now();
  const { res, retries } = withRetry(
    () => http.post(
      `${BASE_URL}/main/events/${eventId}/entries/apply/lottery`,
      JSON.stringify({ courseId, paceId }),
      {
        headers,
        tags: { name: 'lottery_apply' },
        responseCallback: http.expectedStatuses(200, 400, 409),
      }
    ),
    { maxRetries: 1, backoffSec: 2, name: '응모 신청', vu: __VU }
  );
  const elapsed = Date.now() - start;
  applyLatency.add(elapsed);
  if (exec.instance.vusActive >= PEAK_VU_THRESHOLD) {
    peakApplyLatency.add(elapsed);
  }

  if (res.status === 200) {
    const ok = check(res, {
      'has entryId': (r) => {
        try { return r.json().data.entryId != null; }
        catch (e) { return false; }
      },
    });
    applyOk.add(1);
    errorRate.add(false);
    resultLog(__VU, `응모 성공`, retries);
  } else if (res.status === 400 || res.status === 409) {
    applyDup.add(1);
    errorRate.add(false);
    resultLog(__VU, `이미 신청됨 (${res.status})`, retries);
  } else {
    unexpectedErr.add(1);
    errorRate.add(true);
    errorLog(__VU, `응모 실패 (${res.status})`);
  }
}

// ── handleSummary: 통합 리포트 출력 ──
export function handleSummary(data) {
  return buildSummaryOutput(data, {
    testType: 'LOAD',
    flow: 'LOTTERY',
    vuCount: VU_COUNT,
  });
}
