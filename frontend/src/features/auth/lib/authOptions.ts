import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import NaverProvider from 'next-auth/providers/naver';
import KakaoProvider from 'next-auth/providers/kakao';
import axios from 'axios';
import { authService } from '../services';
import { LoginRequest } from '../types';

// NextAuth 콜백은 서버에서 실행되므로 상대경로('/api')가 아닌
// 게이트웨이 절대 URL로 직접 호출한다. (BFF는 브라우저 전용)
const authBackend = axios.create({
  baseURL: process.env.ACCOUNT_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Email Login',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          const res = await authBackend.post('/login', {
            email: credentials?.email?.toString() ?? '',
            password: credentials?.password?.toString() ?? '',
          });

          // 백엔드 응답은 ApiResponse<LoginResponse> 래퍼
          const apiResponse = res.data;
          if (apiResponse?.success && apiResponse.data) {
            const d = apiResponse.data;
            return {
              id: d.id.toString(),
              email: d.email ?? credentials?.email,
              name: d.name ?? credentials?.email,
              accessToken: d.accessToken,
              refreshToken: d.refreshToken,
            };
          }

          return null;
        } catch (error: any) {
          console.error('Login Authorize Error:', error?.response?.data ?? error?.message);
          return null;
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'select_account',
          response_type: 'code',
        },
      },
    }),
    NaverProvider({
      clientId: process.env.NAVER_CLIENT_ID!,
      clientSecret: process.env.NAVER_CLIENT_SECRET!,
      authorization: {
        params: {
          auth_type: 'reauthenticate',
        },
      },
      profile(profile) {
        return {
          id: profile.response.id,
          name: profile.response.name || profile.response.nickname,
          email: profile.response.email,
          image: profile.response.profile_image,
        };
      },
    }),
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'login',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      // 일반 로그인 (Credentials) 시 실행
      if (account && user) {
        if (account.provider === 'credentials') {
          // 로컬 로그인 유저 전용 데이터 추가
          token.loginType = 'local';
          token.springAccessToken = user.accessToken;
          token.springRefreshToken = user.refreshToken;
          token.isUnregistered = false;
        } else {
          // 소셜 로그인 유저 전용 데이터 추가
          token.loginType = 'social';
          const data: LoginRequest = {
            email: user.email ?? '',
            password: `social_login_${user.id}`,
          };

          const response = await authService.login(data);

          // 응답 성공 여부 확인
          if (response.success && response.data) {
            const socialUser = {
              accessToken: response.data.accessToken,
              refreshToken: response.data.refreshToken,
            };

            token.springAccessToken = socialUser.accessToken;
            token.springRefreshToken = socialUser.refreshToken;
            token.isUnregistered = false;
          } else {
            token.springAccessToken = undefined;
            token.springRefreshToken = undefined;
            token.isUnregistered = true;
          }
        }
      }

      return token;
    },

    async session({ session, token }) {
      // 공통으로 Spring 토큰을 세션에 주입
      session.accessToken = token.springAccessToken;
      session.refreshToken = token.springRefreshToken;
      session.isUnregistered = token.isUnregistered;

      return session;
    },
  },
};
