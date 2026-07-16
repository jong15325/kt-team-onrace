'use client';

import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Event } from '@/features/event/types';
import { eventService } from '@/features/event/services';
import { useRouter } from 'next/navigation';
import { LuCircleAlert } from 'react-icons/lu';
import {
  getAppTypeLabel,
  getStatusConfig,
  getStatusLabel,
  getTypeLabel,
} from '@/types/constants';
import { useEventStore } from '@/features/event/store/useEventStore';
import { cn } from '@/lib/utils';
import MilestonesContent from './contents/MilestonesContent';
import CategoryContent from './contents/CategoryContent';
import SystemInfoContent from './contents/SystemInfoContent';

export default function Body() {
  const router = useRouter();

  const [events, setEvents] = useState<Event[]>([]);

  const [mainEvents, setMainEvents] = useState<Event[]>([]);
  const { setEvent } = useEventStore();

  const displayStatusLabel = (status: string) => {
    let displayLabel = '';

    switch (status) {
      case 'READY':
        const dateStr = '2026-06-15T09:00:00';
        const date = new Date(dateStr);

        const formattedDate = new Intl.DateTimeFormat('ko-KR', {
          month: 'long', // "3월"
          day: 'numeric', // "15일"
          hour: 'numeric', // "9시"
          minute: 'numeric',
          hour12: false, // 24시간 형식
        }).format(date);

        displayLabel = `${formattedDate} ${getStatusLabel(status)}`;
        break;
      case 'CLOSING_SOON':
        displayLabel = `내일 ${getStatusLabel(status)}`;
        break;
      case 'DRAW_COMPLETED':
        displayLabel = getStatusLabel('END');
        break;
      default:
        displayLabel = getStatusLabel(status);
    }

    return displayLabel;
  };

  const handleEventDetail = (event: Event) => {
    setEvent(event);
    router.push(`/ticketing/${event.id}`);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await eventService.getEvents({ size: 5 });
        const filterData = result.data.content.filter(
          (item) => item.id !== 4 && item.id !== 5,
        );
        setEvents(result.data.content);
        setMainEvents(filterData);
      } catch (error) {
        console.error('데이터 로드 실패:', error);
      }
    };

    fetchData();
  }, []);

  return (
    <main className="flex flex-col ">
      {/* --- 이벤트 목록 (Event List) --- */}
      <section className="bg-white">
        <div className="max-w-7xl px-30 py-20 w-full mx-auto">
          {/* 섹션 타이틀 */}
          <div className="mb-12 flex justify-between items-end">
            <div>
              <h2 className="text-5xl font-bold text-black tracking-tighter">
                다가오는 러닝 이벤트
              </h2>
            </div>
          </div>

          {/* 이벤트 리스트 */}
          <div>
            {mainEvents && mainEvents.length > 0 ? (
              mainEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex flex-row items-center justify-between p-6 py-8 mb-4 bg-gray-50"
                >
                  <div className="flex items-center w-full md:w-auto mb-4 md:mb-0">
                    {/* 날짜 영역 (왼쪽) */}
                    <div className="flex flex-col items-center justify-center min-w-[80px] border-r border-gray-200 pr-6 mr-8">
                      <span className="text-base text-black">
                        {new Date(event.eventAt).getMonth() + 1}월
                      </span>
                      <span className="text-3xl font-bold text-black">
                        {new Date(event.eventAt).getDate()}
                      </span>
                    </div>

                    {/* 상태/타이틀/지역 영역 (중앙) */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold px-2 py-1 rounded-sm bg-black text-font-accent">
                          {getTypeLabel(event.type)}
                        </span>
                        <span className="text-xs font-bold px-2 py-1 rounded-sm bg-gray-100 text-font-medium">
                          {getAppTypeLabel(event.appType)}
                        </span>
                        <span
                          className={cn(
                            'text-xs font-bold px-2 py-1 rounded-sm bg-gray-200',
                            getStatusConfig(event.status),
                          )}
                        >
                          {displayStatusLabel(event.status)}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-black transition-colors">
                        {event.title}
                      </h3>
                      <div className="text-sm text-gray-500">
                        <span>{event.venue}</span>
                        <span className="mx-1 shrink-0">·</span>
                        <span>
                          {event.courses.map((c) => c.name).join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 신청 버튼 영역 (우측 끝) */}
                  <div className="">
                    <Button
                      variant="primary1"
                      rounded="full"
                      size="default"
                      // disabled={event.status !== '신청중'}
                      onClick={() => handleEventDetail(event)}
                    >
                      상세 보기
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center transition-colors">
                <div className="text-gray-300">
                  <LuCircleAlert size={40} />
                </div>

                {/* 이벤트가 없을 경우 */}
                <div className="py-4 text-font-medium">
                  <p>다가오는 이벤트가 없습니다.</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center">
              <Button
                variant="outline"
                rounded="full"
                size="fit"
                onClick={() => router.push('/event')}
              >
                이벤트 전체보기
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* --- 플랫폼 소개 --- */}
      <MilestonesContent />
      <CategoryContent />
      <SystemInfoContent />
    </main>
  );
}
