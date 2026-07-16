// ========================================================
// 스모크 테스트: 환경 검증 (5 VU)
//
// 목적: 본 테스트 전 서비스 정상 동작 확인
// 흐름: 데이터 셋업 → 로그인 → 이벤트 조회 (3개) → 재고 확인
// 실행: k6 run k6/scenarios/00-smoke-test.js
// ========================================================

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { batchLoginAll, authHeaders } from '../lib/auth.js';
import { setupTestData } from '../lib/setup.js';
import { buildSummaryOutput } from '../lib/report.js';
import { BASE_URL } from '../lib/config.js';

const SMOKE_VU = 5;

// 커스텀 메트릭 (다른 시나리오와 네이밍 통일 — apply_ok / unexpected_error / error_rate / apply_latency)
// 스모크 테스트에서는 "환경 검증 성공/실패"로 재해석됨
const applyOk       = new Counter('apply_ok');         // 모든 check 통과
const unexpectedErr = new Counter('unexpected_error'); // 하나라도 실패
const errorRate     = new Rate('error_rate');
const applyLatency  = new Trend('apply_latency');

export const options = {
  vus: SMOKE_VU,
  iterations: SMOKE_VU,
  setupTimeout: '300s',
  thresholds: {
    http_req_failed: ['rate==0'],
  },
};

// ── setup: 데이터 셋업 → 5명 로그인 ──
export function setup() {
  const testData = setupTestData();
  const tokens = batchLoginAll(SMOKE_VU);
  return { tokens, eventIds: testData.eventIds, paceMap: testData.paceMap };
}

export default function (data) {
  const iterStart = Date.now();
  let allOk = true;

  // 1. 사전 로그인 토큰 획득
  const token = data.tokens[String(__VU)];
  const loginOk = check(token, {
    '로그인 성공': (t) => t != null,
  });
  if (!loginOk) {
    unexpectedErr.add(1);
    errorRate.add(true);
    applyLatency.add(Date.now() - iterStart);
    return;
  }

  const headers = authHeaders(token);

  // 2. 각 이벤트 조회 (동적 ID)
  const eventIds = [
    data.eventIds.LOTTERY,
    data.eventIds.FIRST_COME_NO_QUEUE,
    data.eventIds.FIRST_COME_WITH_QUEUE,
  ];
  for (const eid of eventIds) {
    const res = http.get(`${BASE_URL}/main/events/${eid}`, {
      headers: headers,
      tags: { name: 'event_detail' },
    });
    const ok = check(res, {
      [`이벤트 ${eid} 조회 성공`]: (r) => r.status === 200,
    });
    if (!ok) allOk = false;
  }

  // 3. 재고 확인 (paceMap에서 HOT paceId 동적 추출)
  const fcNoQueueId = data.eventIds.FIRST_COME_NO_QUEUE;
  const paceMapEntry = data.paceMap[String(fcNoQueueId)];
  const hotPaceId = paceMapEntry && paceMapEntry.hot && paceMapEntry.hot.length > 0
    ? paceMapEntry.hot[0].paceId
    : null;

  if (hotPaceId) {
    const stockRes = http.get(
      `${BASE_URL}/main/events/${fcNoQueueId}/entries/stock-check?paceId=${hotPaceId}`,
      { headers: headers, tags: { name: 'stock_check' } }
    );
    const ok = check(stockRes, {
      '재고 조회 성공': (r) => r.status === 200,
    });
    if (!ok) allOk = false;
  }

  // 최종 결과 집계
  applyLatency.add(Date.now() - iterStart);
  if (allOk) {
    applyOk.add(1);
    errorRate.add(false);
  } else {
    unexpectedErr.add(1);
    errorRate.add(true);
  }

  sleep(1);
}

// ── handleSummary: 통합 리포트 출력 (01~04와 동일한 템플릿 사용) ──
export function handleSummary(data) {
  return buildSummaryOutput(data, {
    testType: 'LOAD',
    flow: 'SMOKE',
    vuCount: SMOKE_VU,
  });
}
