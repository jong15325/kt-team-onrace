// ========================================================
// 공유 리포트 템플릿 라이브러리
//
// 부하 테스트(01~03) + 용량 테스트(04) 공용
// 성능 지표 + 비즈니스 지표 통합 리포트 생성
// ========================================================

import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';
import { describeStages } from './breakpoint.js';
import {
  BASE_URL,
  TARGET_AVG_RESPONSE_MS,
  TARGET_ERROR_RATE,
  TARGET_SUCCESS_RATE,
} from './config.js';

// ================================================================
// 공통 유틸
// ================================================================

function fmt(n) {
  return n != null ? n.toLocaleString() : '0';
}

function pct(part, total) {
  if (!total || total === 0) return '0.0';
  return ((part / total) * 100).toFixed(1);
}

function counter(metrics, name) {
  return metrics[name] ? metrics[name].values.count : 0;
}

function formatDuration(ms) {
  const sec = ms / 1000;
  const mins = Math.floor(sec / 60);
  const secs = Math.round(sec % 60);
  return `${mins}분 ${secs}초`;
}

function fmtMs(ms) {
  return ms != null ? `${ms}ms` : '-';
}

// ================================================================
// 헤더 섹션
// ================================================================

function formatLoadTestHeader(config) {
  // SMOKE 전용 헤더 — 부하 테스트 박스와 동일한 포맷 유지 (템플릿 통일)
  if (config.flow === 'SMOKE') {
    return [
      '',
      '========================================',
      '         스모크 테스트 리포트',
      '========================================',
      `테스트 대상:   ${BASE_URL}`,
      `테스트 흐름:   SMOKE (환경 검증)`,
      `동시 사용자:   ${fmt(config.vuCount)} VUs`,
    ];
  }

  const lines = [
    '',
    '========================================',
    '         부하 테스트 리포트',
    '========================================',
    `테스트 대상:   ${BASE_URL}`,
    `테스트 흐름:   ${config.flow}`,
    `동시 사용자:   ${fmt(config.vuCount)} VUs`,
  ];
  if (config.totalStock != null) {
    lines.push(`총 재고:       ${fmt(config.totalStock)}석`);
  }
  return lines;
}

function formatBreakpointHeader(config) {
  const stagesDesc = describeStages(config.startVUs, config.stepVUs, config.maxVUs);
  return [
    '',
    '========================================',
    '     용량(Breakpoint) 테스트 리포트',
    '========================================',
    `테스트 대상:   ${BASE_URL}`,
    `테스트 흐름:   ${config.flow}`,
    `스테이지 구성:  ${stagesDesc}`,
    `단계 유지:     ${config.stepDurationSec}초 (ramp ${config.rampSec}초)`,
    `로그인 풀:     ${config.loginPool ? fmt(config.loginPool) + '명' : 'BP_MAX_VUS와 동일'}`,
    `중단 임계값:   에러율 > ${(config.errorThreshold * 100).toFixed(0)}% 또는 p95 > ${config.p95ThresholdMs}ms`,
  ];
}

// ================================================================
// 성공 지표 섹션 (Executive Summary)
// ================================================================

function formatSuccessMetrics(data, config) {
  if (config.flow === 'SMOKE') return [];

  const metrics = data.metrics;
  const isBreakpoint = config.testType === 'BREAKPOINT';

  // ── 1. 동시 접속 처리 가능 사용자 수 ──
  let actualVUs, targetVUs;
  if (isBreakpoint) {
    actualVUs = metrics.vus ? (metrics.vus.values.max || 0) : 0;
    targetVUs = config.maxVUs;
  } else {
    actualVUs = metrics.vus_max ? metrics.vus_max.values.value : 0;
    targetVUs = config.vuCount;
  }
  const vuPass = actualVUs >= targetVUs;

  // ── 2. 평균 응답 시간 ──
  const latencyMetric = metrics.apply_latency || metrics.http_req_duration;
  const avgMs = latencyMetric && latencyMetric.values.avg != null
    ? Math.round(latencyMetric.values.avg) : 0;
  const targetMs = TARGET_AVG_RESPONSE_MS;
  const avgPass = avgMs > 0 && avgMs <= targetMs;

  // ── 3. 서버 에러율 ──
  let actualErrorRate;
  if (metrics.error_rate) {
    actualErrorRate = metrics.error_rate.values.rate || 0;
  } else {
    actualErrorRate = metrics.http_req_failed ? metrics.http_req_failed.values.rate : 0;
  }
  const actualErrorPct = actualErrorRate * 100;
  const targetErrorPct = isBreakpoint
    ? config.errorThreshold * 100
    : TARGET_ERROR_RATE * 100;
  const errorPass = actualErrorPct <= targetErrorPct;

  // ── 4. 요청 성공률 ──
  // 비즈니스 에러(409 중복, 400 매진)는 서버가 정상 처리한 것이므로 성공에 포함
  const applyOk  = counter(metrics, 'apply_ok');
  const applyDup = counter(metrics, 'apply_dup');
  const errCount = counter(metrics, 'unexpected_error');
  const totalAttempts = applyOk + applyDup + errCount;
  const successRate = totalAttempts > 0
    ? (applyOk + applyDup) / totalAttempts * 100 : 100;
  const targetSuccessPct = isBreakpoint
    ? (1 - config.errorThreshold) * 100
    : TARGET_SUCCESS_RATE * 100;
  const successPass = successRate >= targetSuccessPct;

  // ── 여유% 계산 유틸 ──
  function margin(actual, target, lowerIsBetter) {
    let pass, pctMargin;
    if (lowerIsBetter) {
      pass = actual <= target;
      pctMargin = target > 0 ? (target - actual) / target * 100 : 100;
    } else {
      pass = actual >= target;
      pctMargin = target > 0 ? (actual - target) / target * 100 : 0;
    }
    if (!pass) return 'FAIL';
    if (pctMargin > 999) return 'PASS';
    return `~${Math.round(pctMargin)}% 여유`;
  }

  const allPass = vuPass && avgPass && errorPass && successPass;

  return [
    '',
    '========================================',
    allPass ? '  성공 지표 — ALL PASS' : '  성공 지표 — FAIL 항목 있음',
    '========================================',
    `  ${vuPass ? 'PASS' : 'FAIL'}  동시 접속:  ${fmt(actualVUs)} / ${fmt(targetVUs)} VUs — ${vuPass ? 'PASS' : 'FAIL'}`,
    `  ${avgPass ? 'PASS' : 'FAIL'}  평균 응답:  ${fmt(avgMs)}ms / ${fmt(targetMs)}ms — ${margin(avgMs, targetMs, true)}`,
    `  ${errorPass ? 'PASS' : 'FAIL'}  에러율:    ${actualErrorPct.toFixed(2)}% / ${targetErrorPct.toFixed(1)}% — ${margin(actualErrorPct, targetErrorPct, true)}`,
    `  ${successPass ? 'PASS' : 'FAIL'}  성공률:    ${successRate.toFixed(2)}% / ${targetSuccessPct.toFixed(1)}% — ${margin(successRate, targetSuccessPct, false)}`,
    '========================================',
  ];
}

// ================================================================
// 성능 지표 섹션
// ================================================================

function latencyPercentiles(metric) {
  const v = metric ? metric.values : {};
  return {
    p50: v.med != null ? Math.round(v.med) : null,
    p90: v['p(90)'] != null ? Math.round(v['p(90)']) : null,
    p95: v['p(95)'] != null ? Math.round(v['p(95)']) : null,
    count: metric ? metric.values.count || 0 : 0,
  };
}

function formatPerformanceMetrics(data) {
  const metrics = data.metrics;

  // ─────────────────────────────────────────────
  // 테스트 시간 분해: 전체 = setup(로그인 포함) + 실제 부하 + teardown
  //
  // - totalMs: k6가 측정한 setup→teardown 전체 시간
  // - setupMs: auth.js/batchLoginAll 내부에서 기록한 로그인 배치 루프 시간
  // - loadMs : 실제 부하 구간(VU 본체 실행) — 전체에서 setup을 뺀 값
  //            teardown(수 초)은 loadMs에 포함되지만 오차 허용
  // ─────────────────────────────────────────────
  const totalMs = data.state.testRunDurationMs;
  const setupMs = (metrics.setup_login_duration && metrics.setup_login_duration.values.max) || 0;
  const loadMs = Math.max(totalMs - setupMs, 1);
  const loadSec = loadMs / 1000;

  const totalReqs = metrics.http_reqs ? metrics.http_reqs.values.count : 0;
  // 평균 RPS는 "부하 구간 시간"을 분모로 사용해 체감과 일치시킨다
  // (로그인 배치 루프가 http_reqs에 포함되어 있지만, 로그인 요청 수는
  //  부하 요청 대비 작은 비율이라 오차 허용)
  const avgRPS = totalReqs > 0 ? (totalReqs / loadSec).toFixed(1) : '0';
  const maxVUs = metrics.vus_max ? metrics.vus_max.values.value : 0;

  // 비즈니스 TPS: 신청 성공(apply_ok) 건수 / 부하 구간 시간
  const applyOkCount = metrics.apply_ok ? metrics.apply_ok.values.count : 0;
  const bizTPS = applyOkCount > 0 ? (applyOkCount / loadSec).toFixed(1) : '0';

  // 에러율: error_rate (커스텀 Rate) 또는 http_req_failed (내장)
  // k6 Rate: add(true)=passes(에러), add(false)=fails(성공)
  let errorRate, errorCount;
  if (metrics.error_rate) {
    errorRate = (metrics.error_rate.values.rate * 100).toFixed(2);
    errorCount = metrics.error_rate.values.passes || 0;
  } else {
    const failed = metrics.http_req_failed ? metrics.http_req_failed.values.rate : 0;
    errorRate = (failed * 100).toFixed(2);
    errorCount = metrics.http_req_failed ? metrics.http_req_failed.values.passes || 0 : 0;
  }

  // 응답시간 (전체): apply_latency (커스텀 Trend) 또는 http_req_duration (내장)
  const overall = latencyPercentiles(metrics.apply_latency || metrics.http_req_duration);

  // 응답시간 (병목 구간): peak_apply_latency — 부하 테스트(01~03)만 기록됨
  // hold 구간(VU >= target*95%)의 샘플만 담긴 Trend
  const peak = metrics.peak_apply_latency ? latencyPercentiles(metrics.peak_apply_latency) : null;

  const lines = [
    `테스트 시간:`,
    `  - 전체:    ${formatDuration(totalMs)}`,
  ];
  if (setupMs > 0) {
    lines.push(`  - 로그인:  ${formatDuration(setupMs)}  (setup)`);
    lines.push(`  - 부하:    ${formatDuration(loadMs)}  (실제 요청)`);
  }
  lines.push('');
  lines.push('성능 지표:');
  lines.push(`  총 요청:     ${fmt(totalReqs)}`);
  lines.push(`  평균 RPS:    ${avgRPS}${setupMs > 0 ? ' (부하 구간 기준)' : ''}`);
  lines.push(`  비즈니스 TPS: ${bizTPS} (신청 성공 기준)`);
  lines.push(`  에러율:      ${errorRate}% (${fmt(errorCount)}건)`);
  lines.push('');
  lines.push('  응답시간 (전체):');
  lines.push(`    p50: ${fmtMs(overall.p50)}  |  p90: ${fmtMs(overall.p90)}  |  p95: ${fmtMs(overall.p95)}`);

  // peak 메트릭이 있고 샘플이 1건 이상일 때만 병목 구간 섹션 출력
  // (SMOKE, 04-breakpoint는 peak 메트릭을 기록하지 않으므로 자동 생략)
  if (peak && peak.count > 0 && peak.p95 != null) {
    lines.push('  응답시간 (병목 구간, VUs ≥ 95% of target):');
    lines.push(`    p50: ${fmtMs(peak.p50)}  |  p90: ${fmtMs(peak.p90)}  |  p95: ${fmtMs(peak.p95)}`);
  }

  return {
    lines,
    // 용량 테스트 결과 판정용 내부 데이터
    totalReqs,
    avgRPS,
    maxVUs,
    durationSec: loadSec, // 기존 호환: RPS 재계산 등에 사용
    errorCount,
  };
}

// ================================================================
// 비즈니스 지표 섹션
// ================================================================

function formatBusinessMetrics(data, flow) {
  const m = data.metrics;
  const lines = ['', '비즈니스 지표:'];

  const applyOk        = counter(m, 'apply_ok');
  const applyDup       = counter(m, 'apply_dup');
  const confirmOk      = counter(m, 'confirm_ok');
  const paymentDropout = counter(m, 'payment_dropout');
  const wave2Ok        = counter(m, 'wave2_ok');
  const soldOutCount   = counter(m, 'sold_out');
  const blockedCount   = counter(m, 'blocked');
  const unexpectedErr  = counter(m, 'unexpected_error');
  const queuePassCount = counter(m, 'queue_pass');
  const queueTimeoutCt = counter(m, 'queue_timeout');
  // 세분화된 차단 카운터 (FIRST_COME_QUEUE 전용)
  const blockedQueueDup          = counter(m, 'blocked_queue_dup');          // 409 — 대기열 이미 진입
  const blockedTokenExpired      = counter(m, 'blocked_token_expired');      // 429 — passToken 만료
  const blockedReservationExpired = counter(m, 'blocked_reservation_expired'); // 400 ENT_009 — 예약 TTL 만료

  const totalApply = applyOk + applyDup;

  // ─────────────────────────────────────────────
  // SMOKE: 환경 검증 결과만 간결히 출력 후 즉시 return
  //        (LOTTERY/FIRST_COME 공통 라인은 스킵)
  // ─────────────────────────────────────────────
  if (flow === 'SMOKE') {
    lines.push(`  환경 검증 성공: ${fmt(applyOk)}건`);
    lines.push(`  환경 검증 실패: ${fmt(unexpectedErr)}건`);
    return lines;
  }

  // 대기열 지표 (FIRST_COME_QUEUE만)
  if (flow === 'FIRST_COME_QUEUE') {
    lines.push(`  대기열 통과:    ${fmt(queuePassCount)}건`);
    lines.push(`  대기열 타임아웃: ${fmt(queueTimeoutCt)}건`);

    // 대기열 대기시간 (Trend)
    if (m.queue_wait_time) {
      const wt = m.queue_wait_time.values;
      const wtMed = wt.med != null ? Math.round(wt.med) : '-';
      const wt95 = wt['p(95)'] != null ? Math.round(wt['p(95)']) : '-';
      lines.push(`  대기 시간:      p50=${wtMed}ms  |  p95=${wt95}ms`);
    }
  }

  // 신청 지표 (flow별 분기)
  if (flow === 'LOTTERY') {
    lines.push(`  응모 성공:      ${fmt(applyOk)}건${totalApply > 0 ? ` (${pct(applyOk, totalApply)}%)` : ''}`);
  } else {
    lines.push(`  선점 성공:      ${fmt(applyOk)}건${totalApply > 0 ? ` (${pct(applyOk, totalApply)}%)` : ''}`);
  }
  lines.push(`  중복/매진:      ${fmt(applyDup)}건${totalApply > 0 ? ` (${pct(applyDup, totalApply)}%)` : ''}`);

  // 결제 지표 (FIRST_COME / FIRST_COME_QUEUE)
  if (flow === 'FIRST_COME' || flow === 'FIRST_COME_QUEUE') {
    const totalConfirm = confirmOk + wave2Ok;
    lines.push(`  Wave1 결제 확정: ${fmt(confirmOk)}건${applyOk > 0 ? ` (확정률 ${pct(confirmOk, applyOk)}%)` : ''}`);
    lines.push(`  Wave2 결제 확정: ${fmt(wave2Ok)}건`);
    lines.push(`  총 결제 확정:   ${fmt(totalConfirm)}건`);
    lines.push(`  결제 이탈:      ${fmt(paymentDropout)}건`);
    lines.push(`  재선점:         ${fmt(wave2Ok)}건${paymentDropout > 0 ? ` (재선점률 ${pct(wave2Ok, paymentDropout)}%)` : ''}`);
    lines.push(`  매진 차단:      ${fmt(soldOutCount)}건`);
  }

  // 비즈니스 차단 + 서버 에러 (공통)
  // FIRST_COME_QUEUE는 차단 원인을 두 카운터로 분리 출력하여 원인 분석이 가능하도록 함
  if (flow === 'FIRST_COME_QUEUE') {
    lines.push(`  대기열 진입 차단: ${fmt(blockedQueueDup)}건 (이미 대기 중 409)`);
    lines.push(`  선착순 차단:     ${fmt(blockedTokenExpired)}건 (passToken 만료 429)`);
  } else {
    lines.push(`  비즈니스 차단:  ${fmt(blockedCount)}건`);
  }
  // 예약 TTL 만료 차단 (FIRST_COME / FIRST_COME_QUEUE 공통)
  if (flow === 'FIRST_COME' || flow === 'FIRST_COME_QUEUE') {
    lines.push(`  예약 만료 차단:  ${fmt(blockedReservationExpired)}건 (TTL 초과 400)`);
  }
  lines.push(`  서버 에러:      ${fmt(unexpectedErr)}건`);

  return lines;
}

// ================================================================
// 재고 검증 섹션 (FIRST_COME / FIRST_COME_QUEUE 전용)
//
// 02/03 시나리오가 teardown에서 기록한 Gauge를 읽어
// 통합 리포트 안에 "재고 검증:" 블록으로 렌더링한다.
// Gauge가 하나도 없으면 빈 배열을 반환하여 섹션 자체를 생략한다.
// ================================================================

function gaugeValue(metrics, name) {
  if (!metrics[name] || !metrics[name].values) return null;
  const v = metrics[name].values;
  // Gauge는 보통 `value` 속성에 마지막 기록값이 들어 있음
  return v.value != null ? v.value : (v.max != null ? v.max : null);
}

function formatStockVerification(data) {
  const m = data.metrics;
  if (!m.stock_overselling && !m.stock_db_redis_match) {
    return []; // 재고 검증 메트릭이 없는 시나리오는 섹션 생략
  }

  const overselling = gaugeValue(m, 'stock_overselling');
  const matched     = gaugeValue(m, 'stock_db_redis_match');
  const dbConfirmed = gaugeValue(m, 'stock_db_confirmed');
  const redisRem    = gaugeValue(m, 'stock_redis_remaining');

  return [
    '',
    '재고 검증:',
    `  오버셀링:     ${overselling === 1 ? '!! 발생 !!' : '없음 (OK)'}`,
    `  DB-Redis 일치: ${matched === 1 ? '일치 (OK)' : '!! 불일치 !!'}`,
    `  DB 확정:      ${fmt(dbConfirmed != null ? dbConfirmed : 0)}건`,
    `  Redis 잔여:    ${fmt(redisRem != null ? redisRem : 0)}건`,
  ];
}

// ================================================================
// 용량 테스트 결과 판정 섹션
// ================================================================

function formatBreakpointResult(data, config, perf) {
  // ─────────────────────────────────────────────
  // 1. 시나리오 미실행 감지
  //    k6 내장 iterations Counter가 0이면 setup 단계에서 중단된 것
  //    (Trend 메트릭의 values에는 count가 없으므로 Counter 계열을 사용)
  // ─────────────────────────────────────────────
  const iterationsCount = data.metrics.iterations
    ? (data.metrics.iterations.values.count || 0)
    : 0;

  if (iterationsCount === 0) {
    return [
      '========================================',
      ' 시나리오 미실행 — setup 단계 실패 의심',
      '----------------------------------------',
      ' breakpoint iterations=0',
      ' k6 로그에서 setup 에러 메시지를 확인하세요.',
      '========================================',
      ' 아래 성능 지표는 setup(로그인) 요청만 반영된 값이며',
      ' 실제 apply 엔드포인트 성능과 무관합니다.',
      '========================================',
    ];
  }

  // ─────────────────────────────────────────────
  // 2. 실제 도달한 최대 VU 수 (k6 vus Gauge max 사용)
  //    시간 기반 추정보다 정확 — ramping-vus가 실제로 찍은 피크 값
  // ─────────────────────────────────────────────
  const actualPeakVUs = data.metrics.vus
    ? (data.metrics.vus.values.max || 0)
    : 0;
  const reachedVUs = Math.min(actualPeakVUs, config.maxVUs);

  // ─────────────────────────────────────────────
  // 3. 단계 계산 (generateStaircaseStages의 for 루프와 동일한 공식)
  //    for (vus=start; vus<=max; vus+=step) → floor((max-start)/step)+1 개 스테이지
  // ─────────────────────────────────────────────
  const totalSteps = Math.floor((config.maxVUs - config.startVUs) / config.stepVUs) + 1;
  const reachedStep = reachedVUs >= config.startVUs
    ? Math.floor((reachedVUs - config.startVUs) / config.stepVUs) + 1
    : 0;

  // 중단 판정: 실제 도달 VU가 maxVUs(또는 마지막 스테이지 VU)에 못 미치면 중단
  const finalStageVUs = config.startVUs + (totalSteps - 1) * config.stepVUs;
  const aborted = reachedVUs < finalStageVUs;

  const stableStep = aborted ? Math.max(1, reachedStep - 1) : reachedStep;
  const stableVUs = Math.min(
    config.startVUs + (stableStep - 1) * config.stepVUs,
    config.maxVUs
  );

  // ─────────────────────────────────────────────
  // 4. 중단 원인 판정 (어떤 임계값이 초과되었는지)
  // ─────────────────────────────────────────────
  const errorRateValue = data.metrics.error_rate
    ? (data.metrics.error_rate.values.rate || 0)
    : 0;
  const p95Value = (data.metrics.apply_latency && data.metrics.apply_latency.values['p(95)']) || 0;

  const reasons = [];
  if (errorRateValue > config.errorThreshold) {
    reasons.push(`에러율 ${(errorRateValue * 100).toFixed(2)}% > ${(config.errorThreshold * 100).toFixed(0)}%`);
  }
  if (p95Value > config.p95ThresholdMs) {
    reasons.push(`p95 ${Math.round(p95Value)}ms > ${config.p95ThresholdMs}ms`);
  }
  const reasonStr = reasons.length > 0 ? reasons.join(' / ') : '(임계값 미초과 — 조기 종료 원인 확인 필요)';

  // ─────────────────────────────────────────────
  // 5. 리포트 라인 조합
  // ─────────────────────────────────────────────
  const lines = [];

  if (aborted) {
    lines.push('========================================');
    lines.push(' 한계점 도달 — 임계값 초과로 자동 중단');
    lines.push('----------------------------------------');
    lines.push(` 도달 단계:     ${reachedStep}/${totalSteps}단계 (${reachedVUs} VUs)`);
    lines.push(` 최대 안정 단계: ${stableStep}단계 (${stableVUs} VUs)`);
    lines.push(` 중단 원인:     ${reasonStr}`);
    lines.push(` 평균 RPS:      ~${perf.avgRPS} req/s`);
    lines.push('========================================');
    lines.push(` 권장 스케일링 기준값:`);
    lines.push(`  - Pod당 안정 VU:  ~${stableVUs}`);
    lines.push(`  - 안전 마진 70%:  ~${Math.round(stableVUs * 0.7)}`);
    lines.push('========================================');
  } else {
    lines.push('========================================');
    lines.push(' 모든 단계 통과 — 한계점 미도달');
    lines.push('----------------------------------------');
    lines.push(` 최종 단계: ${totalSteps}단계 (${config.maxVUs} VUs)`);
    lines.push(` 평균 RPS:  ~${perf.avgRPS} req/s`);
    lines.push('========================================');
    lines.push(' BP_MAX_VUS를 늘려 재시도하세요.');
    lines.push('========================================');
  }

  return lines;
}

// ================================================================
// 최종 리포트 조합
// ================================================================

/**
 * handleSummary에서 호출하여 최종 출력 객체 생성
 *
 * @param {Object} data   - k6 handleSummary에 전달되는 data 객체
 * @param {Object} config - 테스트 설정 정보
 *   config.testType:  'LOAD' | 'BREAKPOINT'
 *   config.flow:      'LOTTERY' | 'FIRST_COME' | 'FIRST_COME_QUEUE'
 *   // LOAD 전용
 *   config.vuCount, config.totalStock
 *   // BREAKPOINT 전용
 *   config.startVUs, config.stepVUs, config.maxVUs, config.stepDurationSec,
 *   config.rampSec, config.errorThreshold, config.p95ThresholdMs, config.loginPool
 */
export function buildSummaryOutput(data, config) {
  // 1. 헤더
  const header = config.testType === 'BREAKPOINT'
    ? formatBreakpointHeader(config)
    : formatLoadTestHeader(config);

  // 2. 성공 지표 (Executive Summary — SMOKE 제외)
  const successMetrics = formatSuccessMetrics(data, config);

  // 3. 성능 지표
  const perf = formatPerformanceMetrics(data);

  // 4. 비즈니스 지표
  const business = formatBusinessMetrics(data, config.flow);

  // 5. 재고 검증 (FIRST_COME / FIRST_COME_QUEUE 중 Gauge 기록된 경우만)
  const stockVerification = (config.flow === 'FIRST_COME' || config.flow === 'FIRST_COME_QUEUE')
    ? formatStockVerification(data)
    : [];

  // 6. 용량 테스트 결과 (BREAKPOINT만)
  const bpResult = config.testType === 'BREAKPOINT'
    ? formatBreakpointResult(data, config, perf)
    : ['========================================'];

  // 조합 — 헤더 → 성공 지표 → 성능 지표 → 비즈니스 지표 → (재고 검증) → (BP 결과)
  const report = [
    ...header,
    ...successMetrics,
    ...perf.lines,
    ...business,
    ...stockVerification,
    '',
    ...bpResult,
    '',
  ].join('\n');

  const defaultSummary = textSummary(data, { indent: '  ', enableColors: true });

  return {
    stdout: defaultSummary + '\n' + report,
  };
}
