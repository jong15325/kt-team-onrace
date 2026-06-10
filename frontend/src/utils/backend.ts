import axios from 'axios';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/lib/authOptions';

/**
 * BFF(서버) → 게이트웨이 직통 호출용 Axios 인스턴스.
 * 브라우저용 apiClient(baseURL: '/api')와 달리 절대 URL(게이트웨이)을 사용한다.
 */
export const mainServerClient = axios.create({
  baseURL: process.env.MAIN_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

export const accountServerClient = axios.create({
  baseURL: process.env.ACCOUNT_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

export const queueServerClient = axios.create({
  baseURL: process.env.QUEUE_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * NextAuth 세션의 Spring 액세스 토큰을 꺼내 게이트웨이로 전달할
 * Authorization 헤더를 만든다. 게이트웨이가 이 토큰을 검증해
 * 백엔드로 X-User-Id 헤더를 주입한다(JwtAuthenticationWebFilter).
 *
 * 로그인되지 않은 요청이면 빈 객체를 반환한다(선택적 인증 엔드포인트 대응).
 */
export async function serverAuthHeader(): Promise<Record<string, string>> {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
