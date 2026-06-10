'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LuMail } from 'react-icons/lu';

function FindAccountResult() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';

  return (
    <div className="flex flex-col items-center justify-center bg-white p-4">
      <div className="max-w-xl w-full space-y-4 p-10">
        <div>
          <h2 className="flex text-4xl font-bold text-black pb-6">
            아이디 찾기
          </h2>
        </div>

        <div>
          <h2 className="text-2xl font-bold pb-2">
            전화번호를 통한 아이디 찾기
          </h2>
          <div className="flex items-center border border-gray-100 bg-gray-50 rounded-sm mb-6">
            <LuMail size={30} className="m-4 text-font-medium" />
            <span className="text-base text-font-medium">
              {email ? (
                <>가입한 이메일: {email}</>
              ) : (
                <>가입 정보를 확인할 수 없습니다.</>
              )}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            rounded="sm"
            onClick={() => router.push('/find/password')}
          >
            비밀번호 재설정
          </Button>
          <Button
            variant="primary1"
            rounded="sm"
            onClick={() => router.push('/login/email')}
          >
            로그인 페이지로 이동
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function FindAccountResultPage() {
  return (
    <Suspense fallback={null}>
      <FindAccountResult />
    </Suspense>
  );
}
