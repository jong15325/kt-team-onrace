'use client';

import { useEffect, useState } from 'react';
import { myPageService } from '@/features/mypage/services';
import { AccountInfo } from '@/features/mypage/types/accountInfo';

export function EntryParticipationInfo() {
  const [mounted, setMounted] = useState(false);
  const [info, setInfo] = useState<AccountInfo>();

  useEffect(() => {
    setMounted(true);
    myPageService
      .getAccountInfo()
      .then((res) => {
        if (res.success) setInfo(res.data);
      })
      .catch(() => {});
  }, []);

  if (!mounted) {
    return <div className="mb-6 min-h-[100px]" />;
  }

  const formatPhone = (p?: string) =>
    p
      ? p.replace(/[^0-9]/g, '').replace(/^(\d{2,3})(\d{3,4})(\d{4})$/, '$1-$2-$3')
      : '-';

  return (
    <section className="px-2">
      <div className="flex items-center">
        <label className="text-base font-semibold text-black">참가 정보</label>
      </div>
      <div className="p-4 space-y-2">
        <div className="flex text-base">
          <span className="w-24 text-font-medium">이름</span>
          <span className="text-gray-900 font-medium">{info?.name ?? '-'}</span>
        </div>
        <div className="flex text-base">
          <span className="w-24 text-font-medium">휴대폰번호</span>
          <span className="text-gray-900 font-medium">
            {formatPhone(info?.phoneNumber)}
          </span>
        </div>
        <div className="flex text-base">
          <span className="w-24 text-font-medium">이메일</span>
          <span className="text-gray-900 font-medium">{info?.email ?? '-'}</span>
        </div>
      </div>
    </section>
  );
}
