'use client';

import { useEventStore } from '@/features/event/store/useEventStore';
import { Seller } from '@/features/event/types';
import { useEffect, useState } from 'react';
import { LuChevronDown, LuChevronUp } from 'react-icons/lu';

export function SellerInfo({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
}) {
  // 하이드레이션 오류 방지를 위한 마운트 상태 관리
  const [mounted, setMounted] = useState(false);
  const { eventSaleInfo } = useEventStore();

  const seller = eventSaleInfo?.seller;
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
        <h2 className="text-xl font-bold text-black">판매자 정보</h2>
        {/* 상태에 따른 아이콘 변경 */}
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
          {seller && (
            <div className="grid grid-cols-2 md:grid-cols-4 border-t border-l border-gray-300 text-sm md:text-base">
              {/* --- 행 1 --- */}
              <div className="bg-gray-100 px-4 py-4 text-gray-600 border-b border-r border-gray-200 font-medium">
                판매자 상호
              </div>
              <div className="px-4 py-4 text-sm text-gray-900 border-b border-r border-gray-200">
                {seller.sellerName}
              </div>
              <div className="bg-gray-100 px-4 py-4 text-gray-600 border-b border-r border-gray-200 font-medium">
                상업자 등록번호
              </div>
              <div className="px-4 py-4 text-sm text-gray-900 border-b border-r border-gray-200">
                {seller.businessNo}
              </div>

              {/* --- 행 2 --- */}
              <div className="bg-gray-100 px-4 py-4 text-gray-600 border-b border-r border-gray-200 font-medium">
                통신판매업 신고 번호
              </div>
              <div className="px-4 py-4 text-sm border-b border-r border-gray-200">
                {seller.ecommerceNo}
              </div>
              <div className="bg-gray-100 px-4 py-4 text-gray-600 border-b border-r border-gray-200 font-medium">
                통신판매자 중개자 여부
              </div>
              <div className="px-4 py-4 text-sm text-gray-900 border-b border-r border-gray-200">
                {seller.isEcommerceMediator ? '통신판매중개' : '직접 판매'}
              </div>

              {/* --- 행 3 --- */}
              <div className="bg-gray-100 px-4 py-4 text-gray-600 border-b border-r border-gray-200 font-medium">
                고객센터
              </div>
              <div className="px-4 py-4 text-sm border-b border-r border-gray-200">
                {seller.customerService}
              </div>
              <div className="bg-gray-100 px-4 py-4 text-gray-600 border-b border-r border-gray-200 font-medium">
                주소
              </div>
              <div className="px-4 py-4 text-sm text-gray-900 border-b border-r border-gray-200">
                {seller.sellerAddress}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
