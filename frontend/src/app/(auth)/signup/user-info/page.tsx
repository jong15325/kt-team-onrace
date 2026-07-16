'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authService } from '@/features/auth/services';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useSignupStore } from '@/features/auth/store/useSignupStore';

import { LuEye, LuEyeOff, LuX } from 'react-icons/lu';

export default function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');

  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  const [code, setCode] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState<boolean>(false);

  // 이메일 중복확인 결과 메시지 (available: true=사용가능, false=불가/오류)
  const [emailCheckMsg, setEmailCheckMsg] = useState<string>('');
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);

  const setSignupData = useSignupStore((state) => state.setSignupData);

  // 이메일 중복 확인 API 호출
  const handleDuplicationEmail = async () => {
    if (!email) {
      setEmailAvailable(false);
      setEmailCheckMsg('이메일을 입력해주세요.');
      return;
    }
    try {
      // ApiResponse<Boolean>: data === true 이면 이미 사용 중
      const response = await authService.checkEmailAddress({ email });
      if (response.data === true) {
        setEmailAvailable(false);
        setEmailCheckMsg('이미 사용 중인 이메일입니다.');
      } else {
        setEmailAvailable(true);
        setEmailCheckMsg('사용 가능한 이메일입니다.');
      }
    } catch (error: any) {
      setEmailAvailable(false);
      if (error?.response?.status === 429) {
        setEmailCheckMsg('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
      } else {
        setEmailCheckMsg('이메일 확인 중 오류가 발생했습니다.');
      }
    }
  };

  // 휴대폰 본인 인증 API 호출
  const handleCheckCode = async () => {
    // 백엔드는 하이픈 없는 숫자만 허용 → 전 구간 정규화하여 인증키 일치 보장
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    if (!normalizedPhone) {
      alert('휴대폰 번호를 입력해주세요.');
      return;
    }
    try {
      await authService.sendSmsCode({ phoneNumber: normalizedPhone });
      alert('인증번호를 발송했습니다. (3분 이내 입력)');
    } catch (error: any) {
      console.error('SMS 발송 실패:', error?.response?.data ?? error?.message);
      alert('인증번호 발송 중 오류가 발생했습니다.');
    }
  };

  const handleCancelSignup = () => {
    router.push('/login');
  };
  const handleSignup = async () => {
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    if (!password || password !== confirmPassword) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }
    try {
      const verifyResponse = await authService.verifySmsCode({
        phoneNumber: normalizedPhone,
        code,
      });
      if (verifyResponse.success) {
        // 정규화된(하이픈 없는) 번호로 저장 → 가입 요청과 인증키 일치
        setSignupData(email, password, normalizedPhone);
        router.push('/signup/email-auth');
      }
    } catch (error: any) {
      console.error('휴대폰 인증 실패:', error?.response?.data ?? error?.message);
      alert('휴대폰 인증에 실패했습니다. 인증번호를 확인해주세요.');
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-primary">
      <div className="flex flex-col w-full max-w-xl p-8 ">
        <div className="text-4xl font-bold py-4">이메일 회원가입</div>
        <div className="text-2xl font-bold py-4">기본 정보 입력</div>

        <p className="text-sm mb-1">이메일 *</p>
        <div className="flex gap-2 space-y-2 mb-4">
          <Input
            variant="primary"
            placeholder="example@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            rightElement={
              <Button
                variant="primary1"
                size="xs"
                rounded="full"
                className="text-xs"
                onClick={handleDuplicationEmail}
              >
                중복확인
              </Button>
            }
          />
        </div>
        {emailCheckMsg && (
          <p
            className={`text-xs mb-4 px-1 ${
              emailAvailable ? 'text-green-600' : 'text-red-500'
            }`}
          >
            {emailCheckMsg}
          </p>
        )}

        <p className="text-sm mb-1">휴대폰번호</p>
        <div className="flex gap-2 space-y-2 mb-2">
          <Input
            variant="primary"
            placeholder="010-1234-5678"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            rightElement={
              <Button
                variant="primary1"
                size="xs"
                rounded="full"
                className="text-xs"
                onClick={handleCheckCode}
              >
                본인인증
              </Button>
            }
          />
        </div>

        <div className="space-y-2 mb-4">
          <Input
            variant="primary"
            placeholder="인증번호를 입력해주세요*"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            rightElement={
              <Button
                variant="text"
                size="iconSm"
                className="text-gray-400"
                onClick={() => setCode('')}
              >
                <LuX />
              </Button>
            }
          />
        </div>

        <div className="space-y-2 mb-6">
          <Input
            variant="primary"
            placeholder="비밀번호를 입력해주세요"
            label="비밀번호 *"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            rightElement={
              <Button
                variant="text"
                size="iconSm"
                className="text-font-low"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? <LuEyeOff /> : <LuEye />}
              </Button>
            }
          />
          <Input
            variant="primary"
            placeholder="비밀번호를 입력해주세요"
            label="비밀번호 확인 *"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            rightElement={
              <Button
                variant="text"
                size="iconSm"
                className="text-font-low"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
              >
                {showConfirmPassword ? <LuEyeOff /> : <LuEye />}
              </Button>
            }
          />
        </div>

        <div className="flex space-y-2 gap-2">
          <Button
            variant="outline"
            rounded="sm"
            className="border-gray-200"
            onClick={handleCancelSignup}
          >
            취소
          </Button>
          <Button variant="primary1" rounded="sm" onClick={handleSignup}>
            다음
          </Button>
        </div>
      </div>
    </div>
  );
}
