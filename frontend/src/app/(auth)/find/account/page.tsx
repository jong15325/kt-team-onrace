'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authService } from '@/features/auth/services';
import { useState } from 'react';
import { LuPhone } from 'react-icons/lu';

export default function FindAccount() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [resultMsg, setResultMsg] = useState<string>('');
  const [resultOk, setResultOk] = useState<boolean | null>(null);

  // 인증번호 발송 (가입된 번호에만 발송 / 응답은 항상 동일 - 열거 방지)
  const handleSendCode = async () => {
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    if (!normalizedPhone) {
      setResultOk(false);
      setResultMsg('휴대폰 번호를 입력해주세요.');
      return;
    }
    try {
      await authService.sendSmsCodeForFind({ phoneNumber: normalizedPhone });
      setResultOk(true);
      setResultMsg('인증번호를 발송하였습니다. (가입된 번호인 경우)');
    } catch {
      setResultOk(false);
      setResultMsg('에러가 발생하였습니다, 재시도 해주세요');
    }
  };

  // 인증번호 검증 후 가입 이메일 조회
  const handleFindAccount = async () => {
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    if (!normalizedPhone || !code) {
      setResultOk(false);
      setResultMsg('휴대폰 번호와 인증번호를 입력해주세요.');
      return;
    }
    try {
      // 1) SMS 인증 (검증 성공 시 서버에 인증 플래그 설정)
      const verifyResponse = await authService.verifySmsCode({
        phoneNumber: normalizedPhone,
        code,
      });
      if (!verifyResponse.success) {
        setResultOk(false);
        setResultMsg('인증번호가 올바르지 않거나 만료되었습니다.');
        return;
      }

      // 2) 가입 이메일(마스킹) 조회
      const response = await authService.findAccount({
        phoneNumber: normalizedPhone,
      });
      if (response.success && response.data) {
        router.push(
          `/find/account/result?email=${encodeURIComponent(response.data.email)}`,
        );
      } else {
        setResultOk(false);
        setResultMsg('가입 정보를 찾을 수 없습니다.');
      }
    } catch (error: any) {
      setResultOk(false);
      setResultMsg(
        error?.response?.data?.message ??
          '에러가 발생하였습니다, 재시도 해주세요',
      );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center bg-white p-4">
      <div className="max-w-xl w-full space-y-4">
        <div>
          <h2 className="flex text-4xl font-bold text-black pb-6">
            아이디 찾기
          </h2>
        </div>

        <div>
          <h2 className="text-2xl font-bold">전화번호를 통한 아이디 찾기</h2>

          <div className="flex items-center border border-gray-100 bg-gray-50 rounded-sm mb-4">
            <LuPhone size={30} className="m-4 text-font-medium" />
            <span className="text-base text-font-medium">
              전화번호를 입력하시면 가입된 이메일 정보를 확인하실 수 있습니다.
            </span>
          </div>
        </div>

        <div className="mb-2">
          <Input
            label="휴대폰번호"
            placeholder="010-1234-5678"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            rightElement={
              <Button
                variant="primary1"
                size="xs"
                rounded="full"
                className="text-xs"
                onClick={handleSendCode}
              >
                인증번호 발송
              </Button>
            }
          />
        </div>

        <div className="mb-2">
          <Input
            label="인증번호"
            placeholder="인증번호를 입력해주세요"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>

        {resultMsg && (
          <p
            className={`text-xs mb-2 px-1 ${
              resultOk ? 'text-green-600' : 'text-red-500'
            }`}
          >
            {resultMsg}
          </p>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            rounded="sm"
            onClick={() => router.push('/find/password')}
          >
            비밀번호 재설정
          </Button>
          <Button variant="primary1" rounded="sm" onClick={handleFindAccount}>
            찾기
          </Button>
        </div>
      </div>
    </div>
  );
}
