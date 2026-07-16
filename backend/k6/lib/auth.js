// ========================================================
// 로그인 및 인증 헬퍼
// Gateway 경유: POST /auth/login → Auth 서비스
// ========================================================

import http from 'k6/http';
import { sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { BASE_URL, USER_PASSWORD, LOGIN_TIMEOUT, LOGIN_BATCH_SIZE } from './config.js';

/**
 * setup() 일괄 로그인에 걸린 전체 시간(ms)
 * batchLoginAll 내부에서 1회 기록된다. report.js가 이 값을 읽어
 * "테스트 시간"에서 로그인 구간을 분리해 출력한다.
 * (네이밍 컨벤션: queue_wait_time, apply_latency 등 기존 Trend와 동일하게 단위 접미사 생략)
 */
export const setupLoginDuration = new Trend('setup_login_duration');

/**
 * VU 인덱스 → 이메일 (k6user00001@test.com ~ k6user30000@test.com)
 */
export function getUserEmail(vuIndex) {
  return `k6user${String(vuIndex).padStart(5, '0')}@test.com`;
}

/**
 * Gateway 경유 로그인, accessToken 반환
 * 실패 시 null 반환
 */
export function login(vuIndex) {
  const email = getUserEmail(vuIndex);
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: email, password: USER_PASSWORD }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'login' },
      timeout: LOGIN_TIMEOUT,
    }
  );

  if (res.status !== 200) {
    console.error(`Login failed [${email}]: ${res.status} ${res.body}`);
    return null;
  }

  const body = res.json();
  return body.data.accessToken;
}

/**
 * 인증 헤더 생성
 */
export function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

/**
 * setup() 단계에서 전체 유저 일괄 로그인
 * http.batch()를 사용하여 배치 단위로 병렬 로그인 수행
 *
 * @param {number} totalUsers - 총 유저 수 (VU 1 ~ totalUsers)
 * @returns {Object} { "1": "token1", "2": "token2", ... }
 */
export function batchLoginAll(totalUsers) {
  const tokens = {};
  const batchSize = LOGIN_BATCH_SIZE;
  const totalBatches = Math.ceil(totalUsers / batchSize);
  const loginStartMs = Date.now();

  console.log(`[setup] 일괄 로그인 시작: ${totalUsers}명, 배치=${batchSize}, 총 ${totalBatches}배치`);

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const start = batchIdx * batchSize + 1;
    const end = Math.min((batchIdx + 1) * batchSize, totalUsers);

    // http.batch() 요청 배열 구성
    const requests = [];
    for (let vuIdx = start; vuIdx <= end; vuIdx++) {
      requests.push([
        'POST',
        `${BASE_URL}/auth/login`,
        JSON.stringify({ email: getUserEmail(vuIdx), password: USER_PASSWORD }),
        { headers: { 'Content-Type': 'application/json' }, tags: { name: 'setup_login' }, timeout: LOGIN_TIMEOUT },
      ]);
    }

    // 배치 실행
    const responses = http.batch(requests);

    // 성공/실패 분류
    const retryIndices = [];
    for (let i = 0; i < responses.length; i++) {
      const vuIdx = start + i;
      if (responses[i].status === 200) {
        try {
          tokens[String(vuIdx)] = responses[i].json().data.accessToken;
        } catch (e) {
          retryIndices.push(i);
        }
      } else {
        retryIndices.push(i);
      }
    }

    // 실패분 1회 재시도
    if (retryIndices.length > 0) {
      console.warn(`[setup] 배치 ${batchIdx + 1}: ${retryIndices.length}건 실패, 재시도 대기`);
      sleep(1.5 + Math.random());  // 1.5~2.5초 분산 대기
      const retryRequests = retryIndices.map((i) => requests[i]);
      const retryResponses = http.batch(retryRequests);
      for (let j = 0; j < retryResponses.length; j++) {
        const vuIdx = start + retryIndices[j];
        if (retryResponses[j].status === 200) {
          try {
            tokens[String(vuIdx)] = retryResponses[j].json().data.accessToken;
          } catch (e) {
            console.warn(`[setup] VU ${vuIdx} 토큰 파싱 실패: ${e.message}`);
          }
        } else {
          console.error(`[setup] 재시도 실패 VU ${vuIdx}: ${retryResponses[j].status}`);
        }
      }
    }

    // 배치 간 쿨다운: DB 커넥션 반환 대기 (pool 소진 방지)
    if (batchIdx < totalBatches - 1) {
      sleep(1.5 + Math.random());  // 1.5~2.5초 분산 대기
    }

    // 진행률 로깅 (10배치마다)
    if ((batchIdx + 1) % 10 === 0 || batchIdx === totalBatches - 1) {
      console.log(`[setup] 로그인 진행: ${batchIdx + 1}/${totalBatches} 배치 (${Object.keys(tokens).length}/${totalUsers} 성공)`);
    }
  }

  const loginElapsedMs = Date.now() - loginStartMs;
  setupLoginDuration.add(loginElapsedMs);
  console.log(`[setup] 일괄 로그인 완료: ${Object.keys(tokens).length}/${totalUsers} 성공 (${Math.round(loginElapsedMs / 1000)}초 소요)`);
  return tokens;
}
