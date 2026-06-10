'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LuMail, LuRefreshCcw } from 'react-icons/lu';
import { useState } from 'react';
import { authService } from '@/features/auth/services';

export default function LoginSuccess() {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  // 하단 인라인 메시지 (ok: true=성공/green, false=오류/red)
  const [resultMsg, setResultMsg] = useState<string>('');
  const [resultOk, setResultOk] = useState<boolean | null>(null);

  const handleSendPasswordResetLink = async () => {
    if (!email) {
      setResultOk(false);
      setResultMsg('이메일을 입력해주세요.');
      return;
    }
    try {
      await authService.sendPasswordResetLink({ email });
      setResultOk(true);
      setResultMsg('재설정 링크를 발송하였습니다, 메일함을 확인해주세요');
    } catch (error: any) {
      setResultOk(false);
      // 쿨다운/요청횟수 초과 등 백엔드 비즈니스 에러 메시지 표시.
      // (쿨다운·한도는 가입 여부와 무관하게 균일 적용되어 노출해도 이메일 열거 위험 없음)
      setResultMsg(
        error?.response?.data?.message ??
          '에러가 발생하였습니다, 재시도 해주세요',
      );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center bg-white p-4">
      <div className="max-w-xl w-full p-10">
        <div>
          <h2 className="flex text-4xl font-bold text-black pb-6">
            비밀번호 재설정
          </h2>
        </div>

        <div>
          <h2 className="text-2xl font-bold">비밀번호 재설정 요청</h2>
          <div className="flex items-center border border-gray-100 bg-gray-50 rounded-sm mb-6">
            <LuMail size={30} className="m-4 text-font-medium" />
            <span className="text-base text-font-medium">
              가입하신 이메일 주소를 입력하시면 비밀번호 재설정
              <br />
              인증 메일을 보내드립니다.
            </span>
          </div>
        </div>

        <div className="text-base">이메일</div>
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1">
            <Input
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              rightElement={
                <Button
                  variant="primary1"
                  size="xs"
                  rounded="full"
                  className="text-xs"
                  onClick={handleSendPasswordResetLink}
                >
                  인증번호 발송
                </Button>
              }
            />
          </div>
        </div>

        {resultMsg && (
          <p
            className={`text-xs mb-4 px-1 ${
              resultOk ? 'text-green-600' : 'text-red-500'
            }`}
          >
            {resultMsg}
          </p>
        )}

        <div className="flex items-center border border-gray-100 bg-gray-50 rounded-sm mb-6">
          <LuRefreshCcw size={25} className="m-4 text-font-medium" />
          <span className="text-font-medium">
            인증 코드 유효 시간: 15분
            <br />※ 인증 메일은 1분 간격, 하루 최대 5회까지 재발송할 수
            있습니다.
          </span>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            rounded="sm"
            onClick={() => router.push('/login/email')}
          >
            취소
          </Button>
          <Button
            variant="primary1"
            rounded="sm"
            onClick={() => router.push('/find/account')}
          >
            아이디 찾기
          </Button>
        </div>
      </div>
    </div>
  );
}
