'use client';

import { Suspense, useCallback, useEffect, useState, useRef } from 'react';
import { EventFilter } from '@/features/event/components';
import { useMarathonFilter } from '@/features/event/hooks';
import { Course, Event } from '@/features/event/types';
import { eventService } from '@/features/event/services';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  TYPE,
  getAppTypeLabel,
  getStatusConfig,
  getStatusLabel,
  getTypeLabel,
} from '@/types/constants';
import { useEventStore } from '@/features/event/store/useEventStore';
import { cn } from '@/lib/utils';
import { LuCircleAlert } from 'react-icons/lu';
import { formatKoreanDate } from '@/features/ticketing/utils/date';

const PAGE_SIZE = 12;

function EventContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setEvent } = useEventStore();

  const [events, setEvents] = useState<Event[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);

  const {
    searchType,
    setSearchLocation,
    setSearchTerm,
    setSearchDistance,
    setSearchDate,
    setSearchType,
    query,
  } = useMarathonFilter();

  // 서버사이드 조회: cursor 없으면 1페이지(교체), 있으면 다음 페이지(append)
  const fetchEvents = useCallback(
    async (cursorParam?: string) => {
      setLoading(true);
      try {
        const response = await eventService.getEvents({
          ...query,
          size: PAGE_SIZE,
          cursor: cursorParam,
        });
        if (response.success) {
          setEvents((prev) =>
            cursorParam
              ? [...prev, ...response.data.content]
              : response.data.content,
          );
          setCursor(response.data.nextCursor ?? undefined);
          setHasNext(response.data.hasNext);
        }
      } catch (error) {
        console.error('이벤트 조회 실패:', error);
      } finally {
        setLoading(false);
      }
    },
    [query],
  );

  // 필터(query) 변경 시 1페이지부터 재조회
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // category 쿼리 파라미터 → 타입 필터 (최초 1회)
  useEffect(() => {
    const category = searchParams.get('category');
    if (category) setSearchType(category);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 무한 스크롤: 다음 커서로 추가 로드
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNext && !loading) {
          fetchEvents(cursor);
        }
      },
      { threshold: 1.0 },
    );
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasNext, loading, cursor, fetchEvents]);

  const discountPrice = (price: number, discountRate: number) => {
    const discounted = price * (1 - discountRate / 100);
    return discounted.toLocaleString('ko-KR');
  };

  const displayStatusLabel = (event: Event) => {
    switch (event.status) {
      case 'READY': {
        const date = new Date(event.appStartAt);
        const formattedDate = new Intl.DateTimeFormat('ko-KR', {
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          hour12: false,
        }).format(date);
        return `${formattedDate} ${getStatusLabel('READY')}`;
      }
      case 'DRAW_COMPLETED':
        return getStatusLabel('END');
      default:
        return getStatusLabel(event.status);
    }
  };

  const handleEventDetail = (event: Event) => {
    setEvent(event);
    router.push(`/ticketing/${event.id}`);
  };

  return (
    <div className="max-w-7xl mx-auto min-h-screen bg-primary1 px-30">
      <header className="text-black py-6">
        <div>
          <h2 className="text-3xl font-bold">이벤트</h2>
          <div className="my-2 h-[2px] bg-black"></div>
        </div>
      </header>

      <main className="max-w-7xl space-y-6">
        <EventFilter
          setSearchTerm={setSearchTerm}
          setSearchDate={setSearchDate}
          setSearchLocation={setSearchLocation}
          setSearchDistance={setSearchDistance}
        />

        <div className="flex flex-wrap gap-1 ">
          {TYPE.map((type) => (
            <Button
              key={type.id}
              variant="outline"
              size="fit"
              rounded="full"
              onClick={() => setSearchType(type.id)}
              className={cn(
                'font-medium',
                searchType === type.id
                  ? 'border-2 text-black border-black'
                  : 'border text-font-low border-cta-outline',
              )}
            >
              {type.label}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex flex-col bg-white rounded-md overflow-hidden hover:shadow-lg cursor-pointer"
              onClick={() => handleEventDetail(event)}
            >
              <div className="relative aspect-[16/16] overflow-hidden bg-gray-100">
                {event.thumbnailImg?.url ? (
                  <img
                    src={event.thumbnailImg.url}
                    alt={'이벤트'}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-sm">
                    이미지 준비중
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <span className="px-2 py-1 rounded-xs bg-black text-font-accent text-xs">
                    {getTypeLabel(event.type)}
                  </span>
                </div>
              </div>

              <div className="p-2 flex flex-col flex-grow">
                <div className="flex-grow">
                  <div className="space-y-1.5">
                    <div className="inline-block px-2 py-0.5 mr-1 rounded-xs text-xs font-bold bg-gray-100 text-gray-500">
                      {getAppTypeLabel(event.appType)}
                    </div>
                    <div
                      className={cn(
                        'inline-block px-2 py-0.5 rounded-xs text-xs font-bold',
                        getStatusConfig(event.status),
                      )}
                    >
                      {displayStatusLabel(event)}
                    </div>
                    <h2 className="font-bold text-black text-xl leading-tight truncate">
                      {event.title}
                    </h2>
                    <div className="flex items-center text-font-low text-sm min-w-0">
                      <span className="truncate shrink-0 max-w-[120px] sm:max-w-none">
                        {event.venue}
                      </span>
                      <span className="mx-1 shrink-0">·</span>
                      <span className="truncate">
                        {event.courses.map((c: Course) => c.name).join(', ')}
                      </span>
                    </div>
                    <div className="flex items-center text-font-low text-sm">
                      <span>{formatKoreanDate(event.eventAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="my-2 flex items-center text-black font-bold">
                  {event.discountRate > 0 && (
                    <p className="text-md text-font-error mr-2">
                      {event.discountRate}%
                    </p>
                  )}
                  <p className="text-xl">
                    {discountPrice(event.minPrice, event.discountRate)}원 ~
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 무한 스크롤 트리거 요소 */}
        <div ref={observerRef} className="h-10" />

        {events.length === 0 && !loading && (
          <div className="text-center p-30 bg-white">
            <LuCircleAlert className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-font-medium font-medium text-lg">
              검색 결과가 없습니다 <br /> 다른 키워드로 다시 검색해 주세요
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function EventPage() {
  return (
    <Suspense fallback={null}>
      <EventContent />
    </Suspense>
  );
}
