'use client';

import { useEventStore } from '@/features/event/store/useEventStore';
import { formatKoreanDate } from '@/features/ticketing/utils/date';
import { useEffect, useState } from 'react';
import { LuChevronDown, LuChevronUp } from 'react-icons/lu';

export function RefundPolicyInfo({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
}) {
  // 하이드레이션 오류 방지를 위한 마운트 상태 관리
  const [mounted, setMounted] = useState(false);
  const { eventSaleInfo } = useEventStore();

  const refundPolicy = eventSaleInfo?.refundPolicy;

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
        <h2 className="text-xl font-bold text-black">취소 및 환불 정책</h2>
        {/* 상태에 따른 아이콘 변경 */}
        {isOpen ? <LuChevronUp size={24} /> : <LuChevronDown size={24} />}
      </button>

      {/* 펼쳐지는 내용 영역 */}
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen
            ? 'grid-rows-[1fr] opacity-100 mb-6'
            : 'grid-rows-[0fr] opacity-0 mb-0'
        }`}
      >
        <div className="overflow-hidden">
          {refundPolicy && (
            <div className="grid grid-cols-2 md:grid-cols-4 border-t border-l border-gray-300 text-sm md:text-base">
              {/* --- 행 1 (환불 가능 기간 / 환불 불가 시점) --- */}
              <div className="bg-gray-100 px-4 py-4 font-medium text-gray-600 border-b border-r border-gray-200">
                환불 가능 기간
              </div>
              <div className="px-4 py-4 text-sm text-gray-900 border-b border-r border-gray-200">
                {formatKoreanDate(refundPolicy.refundStartAt)} ~{' '}
                {formatKoreanDate(refundPolicy.refundEndAt)}
              </div>
              <div className="bg-gray-100 px-4 py-4 font-medium text-gray-600 border-b border-r border-gray-200">
                환불 불가 시점
              </div>
              <div className="px-4 py-4 text-sm text-gray-900 border-b border-r border-gray-200">
                {formatKoreanDate(refundPolicy.nonRefundableAt)}
              </div>

              {/* --- 행 2 (취소 수수료 / 양도 가능여부) --- */}
              <div className="bg-gray-100 px-4 py-4 font-medium text-gray-600 border-b border-r border-gray-200">
                취소 수수료 기준
              </div>
              <div className="px-4 py-4 text-sm text-gray-900 border-b border-r border-gray-200">
                {refundPolicy.cancellationFee}
              </div>
              <div className="bg-gray-100 px-4 py-4 font-medium text-gray-600 border-b border-r border-gray-200">
                양도 가능여부
              </div>
              <div className="px-4 py-4 text-sm text-gray-900 border-b border-r border-gray-200">
                {refundPolicy.isTransferable ? '가능' : '불가능'}
              </div>

              {/* --- 행 3 (환불 취소 정책 - 전체 너비) --- */}
              <div className="bg-gray-100 px-4 py-4 font-medium text-gray-600 border-b border-r border-gray-200 col-span-1">
                환불 취소 정책
              </div>
              <div className="px-4 py-4 text-sm text-gray-900 border-b border-r border-gray-200 col-span-1 md:col-span-3">
                {refundPolicy.refundPolicy}
              </div>

              {/* --- 행 4 (우천/천재지변 시 환불정책 - 전체 너비) --- */}
              <div className="bg-gray-100 px-4 py-4 font-medium text-gray-600 border-b border-r border-gray-200 col-span-1">
                우천/천재지변 시 환불정책
              </div>
              <div className="px-4 py-4 text-sm text-gray-900 border-b border-r border-gray-200 col-span-1 md:col-span-3">
                {refundPolicy.weatherRefund}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
