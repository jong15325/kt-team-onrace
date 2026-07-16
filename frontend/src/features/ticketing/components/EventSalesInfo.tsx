'use client';

import { useEffect, useState } from 'react';
import {
  DeliveryInfo,
  OperatingPolicy,
  RefundPolicyInfo,
  SellerInfo,
} from './details/sales';
import { eventService } from '@/features/event/services';
import { useParams } from 'next/navigation';
import { useEventStore } from '@/features/event/store/useEventStore';

export function EventSalesInfo() {
  const params = useParams();
  const { event, setEventSaleInfo } = useEventStore();

  const [mounted, setMounted] = useState<boolean>(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(0);

  const toggleSection = (index: number) => {
    // 이미 열려있는걸 누르면 닫고(null), 아니면 해당 인덱스를 엶
    setActiveIndex(activeIndex === index ? null : index);
  };
  // 컴포넌트가 마운트된 후에만 렌더링을 허용
  useEffect(() => {
    setMounted(true);
  }, []);

  // 데이터 로드
  useEffect(() => {
    const fetchData = async () => {
      if (!mounted) return;

      try {
        if (event) {
          const eventId = String(params.id);
          const response = await eventService.getSalesInfo(eventId);

          if (response.success) {
            setEventSaleInfo(response.data);
          }
        }
      } catch (error) {
        console.error('데이터 로드 실패:', error);
      }
    };

    fetchData();
  }, [mounted, params.id]);

  // 아직 마운트되지 않았다면 껍데기(Skeleton) 혹은 null 반환
  if (!mounted) {
    return <div className="mb-6 min-h-[100px]" />; // 레이아웃 시프트를 방지하기 위해 최소 높이 설정
  }

  return (
    <div className="space-y-4 mb-6">
      <div>
        {/* 판매자 정보 */}
        <SellerInfo
          isOpen={activeIndex === 0}
          onToggle={() => toggleSection(0)}
        />

        {/* 배송 정보 */}
        <DeliveryInfo
          isOpen={activeIndex === 1}
          onToggle={() => toggleSection(1)}
        />

        {/* 취소 및 환불 정책 */}
        <RefundPolicyInfo
          isOpen={activeIndex === 2}
          onToggle={() => toggleSection(2)}
        />

        {/* 운영 정책 */}
        <OperatingPolicy
          isOpen={activeIndex === 3}
          onToggle={() => toggleSection(3)}
        />
      </div>
    </div>
  );
}
