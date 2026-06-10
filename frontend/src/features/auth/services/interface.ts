import { ApiResponse } from '@/types/api';
import {
  AccessTokenRequest,
  AccessTokenResponse,
  EmailSendCodeRequest,
  EmailVerifyCodeRequest,
  FindAccountRequest,
  FindAccountResponse,
  LoginRequest,
  LoginResponse,
  SendPasswordResetLinkRequest,
  SignupRequest,
  SignupResponse,
  resetPasswordRequest,
  VerifyPasswordLinkRequest,
  CheckEmailAddressRequest,
  SmsSendCodeRequest,
  SmsVerifyCodeRequest,
  Term,
  TermDetails,
  PasswordChangeRequest,
  PassCompleteRequest,
} from '../types';

export interface IAuthService {
  // 회원 API
  signup(data: SignupRequest): Promise<ApiResponse<SignupResponse>>;
  login(data: LoginRequest): Promise<ApiResponse<LoginResponse>>;
  logout(): Promise<ApiResponse<null>>;
  findAccount(
    data: FindAccountRequest,
  ): Promise<ApiResponse<FindAccountResponse>>;
  deleteAccount(): Promise<ApiResponse<null>>;
  checkEmailAddress(
    data: CheckEmailAddressRequest,
  ): Promise<ApiResponse<boolean>>;

  // 약관 API
  getTerms(): Promise<ApiResponse<Term[]>>;
  getTermDetails(id: string): Promise<ApiResponse<TermDetails>>;

  // 패스워드 API
  resetPassword(data: resetPasswordRequest): Promise<ApiResponse<null>>;
  sendPasswordResetLink(
    data: SendPasswordResetLinkRequest,
  ): Promise<ApiResponse<null>>;
  verifyPasswordResetLink(
    data: VerifyPasswordLinkRequest,
  ): Promise<ApiResponse<null>>;

  // 토큰 인증 API
  getAccessToken(
    data: AccessTokenRequest,
  ): Promise<ApiResponse<AccessTokenResponse>>;

  // 이메일 인증 API
  sendEmailCode(data: EmailSendCodeRequest): Promise<ApiResponse<null>>;
  verifyEmailCode(data: EmailVerifyCodeRequest): Promise<ApiResponse<null>>;

  // SMS 인증 API
  sendSmsCode(data: SmsSendCodeRequest): Promise<ApiResponse<null>>;
  sendSmsCodeForFind(data: SmsSendCodeRequest): Promise<ApiResponse<null>>;
  verifySmsCode(data: SmsVerifyCodeRequest): Promise<ApiResponse<null>>;

  // 계정 관리 API (로그인 사용자)
  changePassword(data: PasswordChangeRequest): Promise<ApiResponse<null>>;
  completePassVerification(
    data: PassCompleteRequest,
  ): Promise<ApiResponse<null>>;
}
