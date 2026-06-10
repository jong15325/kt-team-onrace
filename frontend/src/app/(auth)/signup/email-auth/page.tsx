'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSignupStore } from '@/features/auth/store/useSignupStore';
import { LuMail, LuRefreshCcw } from 'react-icons/lu';
import { authService } from '@/features/auth/services';

export default function SignupForm() {
  const router = useRouter();
  const [code, setCode] = useState<string>('');
  const isSent = useRef(false);
  const { email, password, phoneNumber, termAgreements } = useSignupStore();

  useEffect(() => {
    // 보안 체크: 이메일 정보가 없으면 가입 페이지로 돌려보냄 (직접 URL 접근 차단)
    // if (!email) {
    //   alert('잘못된 접근입니다.');
    //   router.replace('/signup');
    //   return;
    // }

    // 인증 메일 발송 함수
    const sendVerificationEmail = async () => {
      if (isSent.current) {
        return;
      }
      isSent.current = true;

      try {
        const response = await authService.sendEmailCode({ email });

        if (!response.success) {
          throw new Error('메일 발송에 실패했습니다.');
        }
      } catch (error) {
        alert('인증 메일 발송 중 오류가 발생했습니다.');
      }
    };

    sendVerificationEmail();
  }, [email, router]);

  const handleFinalSignup = async () => {
    // 약관 동의 단계를 건너뛰어 정보가 비어있으면 raw 400 대신 약관 페이지로 안내
    if (!email || termAgreements.length === 0) {
      alert('약관 동의가 필요합니다. 약관 동의 단계부터 다시 진행해 주세요.');
      router.push('/signup/email/agree');
      return;
    }

    try {
      const veriftEmailResponse = await authService.verifyEmailCode({
        email,
        code,
      });

      if (!veriftEmailResponse.success) {
        alert('인증번호가 올바르지 않거나 만료되었습니다.');
        return;
      }

      const data = {
        email: email,
        password: password,
        phoneNumber: phoneNumber,
        // 약관 동의 페이지에서 수집한 실제 약관 ID/동의값 사용
        termAgreements: termAgreements,
      };
      const signupResponse = await authService.signup(data);

      if (signupResponse.success) {
        router.push('/signup/success');
      }
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ??
        '회원가입에 실패했습니다. 다시 시도해 주세요.';
      console.error('회원가입 실패:', error?.response?.data ?? error?.message);
      alert(msg);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-primary">
      <div className="flex flex-col w-full max-w-xl p-8 ">
        <div className="text-4xl font-bold pb-6">이메일 회원가입</div>
        <div className="text-2xl font-bold py-4">이메일 인증</div>

        <div className="flex items-center border border-gray-100 bg-gray-50 rounded-sm mb-4">
          <LuMail size={30} className="m-4 text-font-medium" />
          <span className="text-base text-font-medium">
            example@email.com으로 인증 번호가 발송되었습니다.
            <br />
            메일함을 확인하시고 인증 번호를 입력해주세요.
          </span>
        </div>

        <div className="space-y-2 mb-4">
          <Input
            variant="primary"
            placeholder="1234"
            label="인증번호 *"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <p className="text-xs text-font-low px-2">
            이메일로 전송된 4자리 인증 코드를 입력해주세요
          </p>
        </div>

        <div className="flex items-center border border-gray-100 bg-gray-50 rounded-sm mb-4">
          <LuRefreshCcw size={30} className="m-4 text-font-medium" />
          <span className="text-font-medium">
            인증 코드 유효 시간: 15분
            <br />※ 인증 메일은 1분 간격, 하루 최대 5회까지 재발송할 수
            있습니다.
          </span>
        </div>

        <div className="flex space-y-2 gap-2">
          <Button
            variant="outline"
            rounded="sm"
            className="border-gray-200"
            onClick={() => router.push('/login')}
          >
            취소
          </Button>
          <Button variant="primary1" rounded="sm" onClick={handleFinalSignup}>
            다음
          </Button>
        </div>
      </div>
    </div>
  );
}
