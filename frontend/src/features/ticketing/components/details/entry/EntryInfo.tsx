'use client';

import { useEventStore } from '@/features/event/store/useEventStore';
import { formatKoreanDate } from '@/features/ticketing/utils/date';
import { cn } from '@/lib/utils';
import { getTypeLabel } from '@/types/constants';
import { useEffect, useState } from 'react';

export function EntryInfo() {
  // 하이드레이션 오류 방지를 위한 마운트 상태 관리
  const [mounted, setMounted] = useState(false);
  const { event, eventDetails } = useEventStore();

  const delivery = eventDetails?.delivery;
  // 컴포넌트가 마운트된 후에만 렌더링을 허용
  useEffect(() => {
    setMounted(true);
  }, []);

  const formatPriceRange = (min: number, max: number) => {
    const minStr = Math.floor(min).toLocaleString('ko-KR');
    const maxStr = Math.floor(max).toLocaleString('ko-KR');

    return min === max ? `${minStr}원` : `${minStr}원 ~ ${maxStr}원`;
  };

  const participationFee = () => {
    const minPrice = event?.minPrice ?? 0;
    const maxPrice = event?.maxPrice ?? 0;
    return formatPriceRange(minPrice, maxPrice);
  };

  const discountParticipationFee = () => {
    const minPrice = event?.minPrice ?? 0;
    const maxPrice = event?.maxPrice ?? 0;
    const discountRate = event?.discountRate ?? 0;

    const ratio = 1 - discountRate / 100;
    return formatPriceRange(minPrice * ratio, maxPrice * ratio);
  };

  const recruitmentType = () => {
    const status = event?.status;
    const appType = event?.appType;

    if (status === 'READY') return '접수 후 추첨';
    if (appType === 'LOTTERY') return '응모 후 추첨';
    if (appType === 'FIRST_COME') return '선착순 신청';
    return '선착순 신청';
  };
  // 아직 마운트되지 않았다면 껍데기(Skeleton) 혹은 null 반환
  if (!mounted) {
    return <div className="mb-6 min-h-[100px]" />; // 레이아웃 시프트를 방지하기 위해 최소 높이 설정
  }

  return (
    <section>
      {event && (
        <div className="space-y-3 mb-4 text-sm">
          <div className="flex">
            <span className="w-24 text-base font-semibold">장소</span>
            <span className="flex-1 text-base">{event.venue}</span>
          </div>
          <div className="flex">
            <span className="w-24 text-base font-semibold">개최일</span>
            <span className="flex-1 text-base">
              {formatKoreanDate(event.eventAt, true)}
            </span>
          </div>
          <div className="flex mb-0">
            <span className="w-24 text-base font-semibold">참가비</span>
            <span
              className={cn(
                'flex-1 text-base',
                event.discountRate > 0
                  ? 'text-sm text-font-low line-through'
                  : 'text-black',
              )}
            >
              {participationFee()}
            </span>
          </div>
          {event.discountRate > 0 && (
            <div className="flex">
              <span className="w-24 text-base font-semibold"></span>
              <p className="text-base font-bold text-font-error mr-2">
                {event.discountRate}%
              </p>
              <span className="flex-1 text-base">
                {discountParticipationFee()}
              </span>
            </div>
          )}

          <div className="flex">
            <span className="w-24 text-base font-semibold">배송정보</span>
            <div className="flex-1 text-base">
              <p>{delivery?.schedule}</p>
              <p className="text-base text-gray-500">{delivery?.feePolicy}</p>
            </div>
          </div>
          <div className="flex">
            <span className="w-24 text-base font-semibold">모집 기간</span>
            <span className="flex-1 text-base">
              {formatKoreanDate(event.appStartAt)} ~
              {formatKoreanDate(event.appEndAt)}
            </span>
          </div>
          {event.appType === 'LOTTERY' && (
            <div className="flex">
              <span className="w-24 text-base font-semibold">추첨 발표일</span>
              <span className="flex-1 text-base">
                {formatKoreanDate(event.resultAt, true)}
              </span>
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center justify-center border border-gray-200 rounded-sm p-4 my-6">
              {/* 카테고리 */}
              <div className="flex flex-col flex-1 items-center justify-center">
                <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">
                  카테고리
                </p>

                <p className="text-base font-bold">
                  {getTypeLabel(event.type)}
                </p>
              </div>

              {/* 중앙 구분선 */}
              <div className="w-px h-8 bg-gray-200" />

              {/* 모집 방식 */}
              <div className="flex flex-col flex-1 items-center justify-center">
                <p className="text-sm text-gray-500 ">모집 방식</p>
                <p className="text-base font-bold">{recruitmentType()}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
