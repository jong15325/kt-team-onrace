'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LuEye, LuEyeOff } from 'react-icons/lu';
import { authService } from '@/features/auth/services';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // 토큰 검증 상태: null=검증중, true=유효, false=무효/만료
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  // 하단 인라인 메시지
  const [formMsg, setFormMsg] = useState('');
  const [formOk, setFormOk] = useState<boolean | null>(null);

  // 진입 시 토큰 검증 (백엔드가 reset_verified 플래그 설정 → 이후 변경 가능)
  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      return;
    }
    let active = true;
    (async () => {
      try {
        const res = await authService.verifyPasswordResetLink({ token });
        if (active) setTokenValid(res.success);
      } catch {
        if (active) setTokenValid(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  const handleReset = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      setFormOk(false);
      setFormMsg('비밀번호가 일치하지 않습니다.');
      return;
    }
    try {
      setSubmitting(true);
      // 토큰 검증·만료는 백엔드(1회용, 15분)가 최종 처리
      const response = await authService.resetPassword({ token, newPassword });
      if (response.success) {
        setFormOk(true);
        setFormMsg('비밀번호가 변경되었습니다. 잠시 후 로그인 페이지로 이동합니다.');
        // 같은 브라우저의 다른 탭(재설정을 요청한 마이페이지 등)에 완료 알림 → 그 탭도 로그인으로 이동
        try {
          const bc = new BroadcastChannel('password-reset');
          bc.postMessage({ type: 'done' });
          bc.close();
        } catch {
          // BroadcastChannel 미지원 환경은 무시
        }
        // 비밀번호 변경 시 기존 세션 무효화(보안): 로그아웃 후 로그인 페이지로 이동
        setTimeout(async () => {
          await signOut({ redirect: false });
          router.push('/login');
        }, 1200);
      } else {
        setFormOk(false);
        setFormMsg(response.message ?? '비밀번호 변경에 실패했습니다.');
      }
    } catch (error: any) {
      setFormOk(false);
      setFormMsg(
        error?.response?.data?.message ??
          '비밀번호 변경에 실패했습니다. 링크가 만료되었을 수 있습니다.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  // 토큰 검증 중
  if (tokenValid === null) {
    return (
      <div className="flex-1 flex items-center justify-center bg-primary">
        <p className="text-font-medium">링크 확인 중...</p>
      </div>
    );
  }

  // 토큰 무효/만료 또는 직접 접근
  if (tokenValid === false) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-primary">
        <div className="flex flex-col w-full max-w-xl p-8 gap-4">
          <h2 className="text-3xl font-bold text-black">유효하지 않은 링크</h2>
          <p className="text-font-medium">
            비밀번호 재설정 링크가 올바르지 않거나 만료되었습니다. 재설정을 다시
            요청해 주세요.
          </p>
          <Button
            variant="primary1"
            rounded="sm"
            onClick={() => router.push('/find/password')}
          >
            비밀번호 재설정 다시 요청
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-primary">
      <div className="flex flex-col w-full max-w-xl p-8">
        <h2 className="text-4xl font-bold pb-6">비밀번호 재설정</h2>
        <p className="text-base text-font-medium mb-6">
          새 비밀번호를 입력해 주세요. (10~16자, 영문/숫자/특수문자 중 2가지 이상
          조합)
        </p>

        <div className="space-y-2 mb-6">
          <Input
            variant="primary"
            type={showPassword ? 'text' : 'password'}
            label="새 비밀번호 *"
            placeholder="새 비밀번호를 입력해주세요"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
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
            type={showPassword ? 'text' : 'password'}
            label="새 비밀번호 확인 *"
            placeholder="새 비밀번호를 다시 입력해주세요"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        {formMsg && (
          <p
            className={`text-xs mb-4 px-1 ${
              formOk ? 'text-green-600' : 'text-red-500'
            }`}
          >
            {formMsg}
          </p>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            rounded="sm"
            className="border-gray-200"
            onClick={() => router.push('/login')}
          >
            취소
          </Button>
          <Button
            variant="primary1"
            rounded="sm"
            onClick={handleReset}
            disabled={submitting}
          >
            {submitting ? '변경 중...' : '비밀번호 변경'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
