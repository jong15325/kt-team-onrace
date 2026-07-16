'use client';

import { useEventStore } from '@/features/event/store/useEventStore';
import { formatKoreanDate } from '@/features/ticketing/utils/date';
import { useEffect, useState } from 'react';
import { LuChevronDown, LuChevronUp } from 'react-icons/lu';

export function DeliveryInfo({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
}) {
  // 하이드레이션 오류 방지를 위한 마운트 상태 관리
  const [mounted, setMounted] = useState(false);
  const { eventSaleInfo } = useEventStore();

  const delivery = eventSaleInfo?.delivery;

  // 컴포넌트가 마운트된 후에만 렌더링을 허용
  useEffect(() => {
    setMounted(true);
  }, []);

  // 아직 마운트되지 않았다면 껍데기(Skeleton) 혹은 null 반환
  if (!mounted) {
    return <div className="mb-6 min-h-[100px]" />; // 레이아웃 시프트를 방지하기 위해 최소 높이 설정
  }

  return (
    <section className="border-b border-gray-300">
      {/* 클릭 가능한 헤더 영역 */}
      <button
        onClick={onToggle}
        className="w-full flex justify-between items-center py-5 px-2 focus:outline-none"
      >
        <h2 className="text-xl font-bold text-black">배송 정보</h2>
        {/* 열림/닫힘 상태 아이콘 */}
        {isOpen ? <LuChevronUp size={24} /> : <LuChevronDown size={24} />}
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen
            ? 'grid-rows-[1fr] opacity-100 mb-6'
            : 'grid-rows-[0fr] opacity-0 mb-0'
        }`}
      >
        <div className="overflow-hidden">
          {delivery && (
            <div className="grid grid-cols-2 md:grid-cols-4 border-t border-l border-gray-300 text-sm md:text-base">
              {/* --- 행 1 --- */}
              <div className="bg-gray-100 px-4 py-4 font-medium text-gray-600 border-b border-r border-gray-200">
                배송 대상
              </div>
              <div className="px-4 py-4 text-sm text-gray-900 border-b border-r border-gray-200">
                {delivery.deliveryTarget}
              </div>
              <div className="bg-gray-100 px-4 py-4 font-medium text-gray-600 border-b border-r border-gray-200">
                배송 방법
              </div>
              <div className="px-4 py-4 text-sm text-gray-900 border-b border-r border-gray-200">
                {delivery.deliveryMethod}
              </div>

              {/* --- 행 2 --- */}
              <div className="bg-gray-100 px-4 py-4 font-medium text-gray-600 border-b border-r border-gray-200">
                배송 일정
              </div>
              <div className="px-4 py-4 text-sm text-gray-900 border-b border-r border-gray-200">
                {formatKoreanDate(delivery.deliveryStartAt)} ~{' '}
                {formatKoreanDate(delivery.deliveryEndAt)}
              </div>
              <div className="bg-gray-100 px-4 py-4 font-medium text-gray-600 border-b border-r border-gray-200">
                배송비
              </div>
              <div className="px-4 py-4 text-sm text-gray-900 border-b border-r border-gray-200">
                {delivery.deliveryFee}
              </div>

              {/* --- 행 3 --- */}
              <div className="bg-gray-100 px-4 py-4 font-medium text-gray-600 border-b border-r border-gray-200">
                배송 가능 지역
              </div>
              <div className="px-4 py-4 text-sm text-gray-900 border-b border-r border-gray-200">
                {delivery.deliveryArea}
              </div>
              <div className="bg-gray-100 px-4 py-4 font-medium text-gray-600 border-b border-r border-gray-200">
                배송지 변경 가능 기간
              </div>
              <div className="px-4 py-4 text-sm text-gray-900 border-b border-r border-gray-200">
                {formatKoreanDate(delivery.addressChangePeriod)}
              </div>

              {/* --- 행 4 (마지막 열 병합 유지) --- */}
              <div className="bg-gray-100 px-4 py-4 font-medium text-gray-600 border-b border-r border-gray-200 col-span-1">
                미배송 시 보상기준
              </div>
              <div className="px-4 py-4 text-sm text-gray-900 border-b border-r border-gray-200 col-span-1 md:col-span-3">
                {delivery.deliveryCompensation}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
