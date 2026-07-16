'use client';

import { useEventStore } from '@/features/event/store/useEventStore';
import { useEffect, useState } from 'react';

export function EventNotice() {
  // 하이드레이션 오류 방지를 위한 마운트 상태 관리
  const [mounted, setMounted] = useState(false);
  const { eventDetails } = useEventStore();

  const notice = eventDetails?.notice ?? '';
  // 컴포넌트가 마운트된 후에만 렌더링을 허용
  useEffect(() => {
    setMounted(true);
  }, []);

  // 아직 마운트되지 않았다면 껍데기(Skeleton) 혹은 null 반환
  if (!mounted) {
    return <div className="mb-6 min-h-[100px]" />; // 레이아웃 시프트를 방지하기 위해 최소 높이 설정
  }

  return (
    <section>
      <div>
        <h2 className="text-xl font-bold mb-2 flex items-center">유의사항</h2>
        <div className="w-full p-2 overflow-hidden bg-gray-100 border-2 rounded text-gray-600">
          {notice}
        </div>
      </div>
    </section>
  );
}
