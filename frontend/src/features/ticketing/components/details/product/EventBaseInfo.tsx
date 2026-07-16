'use client';

import { useEventStore } from '@/features/event/store/useEventStore';
import { formatKoreanDate } from '@/features/ticketing/utils/date';
import { useEffect, useState } from 'react';

export function EventBaseInfo() {
  // 하이드레이션 오류 방지를 위한 마운트 상태 관리

  const [mounted, setMounted] = useState(false);
  const { event } = useEventStore();

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
      {event && (
        <div>
          <div className="flex items-center mb-2">
            <h2 className="text-base font-bold text-gray-800">기본정보</h2>
          </div>

          <div className="grid grid-cols-6 border-1 border-gray-300 border-b border-gray-200 text-sm">
            {/* 행 1-1 */}
            <div className="bg-gray-100 px-4 py-4 text-gray-600 border-b border-gray-200 font-medium">
              상품명
            </div>
            <div className="px-4 py-4 text-gray-600 border-b border-gray-200 border-r border-gray-200 text-sm col-span-2">
              {event.title}
            </div>
            {/* 행 1-2 */}
            <div className="bg-gray-100 px-4 py-4 text-gray-600 border-b border-gray-200 font-medium">
              모집 방식
            </div>
            <div className="px-4 py-4 text-gray-600 border-b border-gray-200 text-sm col-span-2">
              {event.appType === 'LOTTERY'
                ? '사전 응모 후 추첨'
                : '선착순 접수'}
            </div>

            {/* 행 2-1 */}
            <div className="bg-gray-100 px-4 py-4 text-gray-600 border-b border-gray-200 font-medium">
              모집 기간
            </div>
            <div className="px-4 py-4 text-gray-600 border-b border-gray-200 text-sm col-span-2">
              {formatKoreanDate(event.appStartAt)} ~{' '}
              {formatKoreanDate(event.appEndAt)}
            </div>
            {/* 행 2-2 */}
            <div className="bg-gray-100 px-4 py-4 text-gray-600 border-b border-gray-200 font-medium">
              개최 날짜
            </div>
            <div className="px-4 py-4 text-gray-600 border-b border-gray-200 text-sm col-span-2">
              {formatKoreanDate(event.eventAt)}
            </div>

            {/* 행 3-1 */}
            <div className="bg-gray-100 px-4 py-4 text-gray-600 font-medium">
              결과 발표일
            </div>
            <div className="px-4 py-4 text-gray-600 text-sm col-span-2">
              <p>{event.resultAt ? formatKoreanDate(event.resultAt) : '-'}</p>
              <p>
                {event.resultAt && '*주최측 사정에 의해 변경될 수 있습니다.'}
              </p>
              <p></p>
            </div>
            {/* 행 3-2 */}
            <div className="bg-gray-100 px-4 py-4 text-gray-600 font-medium">
              개최 장소
            </div>
            <div className="px-4 py-4 text-gray-600 text-sm col-span-2">
              {event.venue}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
