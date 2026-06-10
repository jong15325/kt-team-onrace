import axios from 'axios';
import { signOut } from 'next-auth/react';

/**
 * 브라우저 → Next.js BFF(/api) 공용 Axios 인스턴스.
 * 모든 feature 서비스가 공유한다.
 *
 * 401(토큰/세션 만료·무효) 응답이면 어떤 페이지에서든
 * 세션을 정리(signOut)하고 로그인 페이지로 이동시킨다.
 */
export const apiClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// 동시 다발 401에서 중복 리다이렉트 방지
let redirecting = false;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    if (
      status === 401 &&
      typeof window !== 'undefined' &&
      !window.location.pathname.startsWith('/login') &&
      !redirecting
    ) {
      redirecting = true;
      try {
        await signOut({ redirect: false });
      } finally {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);
