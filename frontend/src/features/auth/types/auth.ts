import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
    isUnregistered?: boolean;
    userRole?: string;
  }

  interface User {
    // 백엔드에서 받는 유저 정보 타입 정의
    accessToken?: string;
    refreshToken?: string;
    role?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    springAccessToken?: string;
    springRefreshToken?: string;
    isUnregistered?: boolean;
    userRole?: string;
    loginType?: 'local' | 'social';
  }
}

interface TermAgreement {
  termVersionId: number;
  agreed: boolean;
}

export interface SignupRequest {
  email: string;
  name?: string;
  password: string;
  phoneNumber: string;
  termAgreements: TermAgreement[];
}

export interface SignupResponse {
  id: number;
  email: string;
  createAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  id: string;
  name?: string;
  email?: string;
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface FindAccountRequest {
  phoneNumber: string;
}

export interface FindAccountResponse {
  email: string;
}

export interface CheckEmailAddressRequest {
  email: string;
}

export interface Term {
  termVersionId: number;
  termName: string;
  required: boolean;
  version: string;
}

export interface TermDetails {
  termVersionId: number;
  termName: string;
  required: boolean;
  version: string;
  content: string;
}

export interface resetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface SendPasswordResetLinkRequest {
  email: string;
}

export interface VerifyPasswordLinkRequest {
  token: string;
}

export interface AccessTokenRequest {
  refreshToken: string;
}

export interface AccessTokenResponse {
  accessToken: string;
  expiresIn: number;
}

export interface PasswordChangeRequest {
  currentPassword: string;
}

export interface PassCompleteRequest {
  name: string;
  gender?: 'MALE' | 'FEMALE';
  birthdate?: string; // YYYY-MM-DD
}

export interface EmailSendCodeRequest {
  email: string;
}

export interface EmailVerifyCodeRequest {
  email: string;
  code: string;
}

export interface SmsSendCodeRequest {
  phoneNumber: string;
}

export interface SmsVerifyCodeRequest {
  phoneNumber: string;
  code: string;
}
