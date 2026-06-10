'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

import {
  EventProductInfo,
  EventSalesInfo,
  EventEntryInfo,
} from '@/features/ticketing/components';
import { EventThumbnail } from '@/features/ticketing/components';
import { EntryConfirmModal } from '@/features/ticketing/components/details/entry';
import { useEventStore } from '@/features/event/store/useEventStore';
import { useParams } from 'next/navigation';
import { eventService } from '@/features/event/services';
import { useDetailedTracker } from '@/features/ticketing/hooks/useDetailedTracker';
import { collectFingerprint } from '@/lib/fingerprint';
import { ActionCardPage } from '@/features/ticketing/components/details/entry/ActionCardPage';
import { ResultCardPage } from '@/features/ticketing/components/details/entry/ResultCardPage';
import { EventAdminPanel } from '@/features/ticketing/components/EventAdminPanel';

export default function MarathonDetailPage() {
  const params = useParams();
  const { event, eventDetails, setEventDetails, setEventOverview } =
    useEventStore();

  const [mounted, setMounted] = useState<boolean>(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState('product');
  const [minDistance, setMinDistance] = useState(10);
  const [actionCard, setActionCard] = useState<boolean>(false);
  const [resultCard, setResultCard] = useState<boolean>(false);

  const { isRecording, logs, startTracking, stopTracking, getFinalData } =
    useDetailedTracker();

  const handleStart = () => {
    startTracking(minDistance);
  };
  const handleStop = () => {
    stopTracking();
    saveData();
  };

  async function bufferToBase64(buffer: ArrayBuffer): Promise<string> {
    const blob = new Blob([buffer]);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        resolve(res.split(',')[1]); // base64 부분만 추출
      };
      reader.readAsDataURL(blob);
    });
  }

  const saveData = () => {
    const currentLogs = isRecording ? [...logs] : logs;
    if (currentLogs.length === 0) return;

    const RECORD_SIZE = 17;
    const buffer = new ArrayBuffer(currentLogs.length * RECORD_SIZE);
    const view = new DataView(buffer);

    // 이벤트 타입 매핑
    const typeMap: Record<string, number> = {
      pointermove: 0,
      pointerdown: 1,
      pointerup: 2,
    };

    currentLogs.forEach((log, index) => {
      const offset = index * RECORD_SIZE;
      view.setInt32(offset, Math.floor(log.x), true);
      view.setInt32(offset + 4, Math.floor(log.y), true);
      view.setFloat64(offset + 8, log.timestamp, true);
      view.setUint8(offset + 16, typeMap[log.eventType] ?? 255);
    });

    // --- 핑거프린트 가져오기 ---
    const fp = collectFingerprint();

    // --- 데이터를 하나의 객체로 합치기 ---
    const finalData = {
      fingerprint: fp,
      mouseLogs: bufferToBase64(buffer),
      logCount: currentLogs.length,
      timestamp: new Date().toISOString(),
    };
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
          const response = await eventService.getEventDetails(eventId);

          if (response.success) {
            setEventDetails(response.data);
          }

          // 참여 정보(이미 신청 여부/상태) 조회 — 상세 진입(뷰) 시점
          eventService
            .getEventOverview(eventId)
            .then((res) => {
              if (res.success) setEventOverview(res.data);
            })
            .catch(() => {});
        }
      } catch (error) {
        console.error('데이터 로드 실패:', error);
      }
    };

    fetchData();
  }, [mounted, params.id]);

  // 아직 마운트되지 않았다면 껍데기(Skeleton) 혹은 null 반환
  if (!mounted) {
    return <div className="mb-6 min-h-[100px]" />;
  }

  if (!event) {
    return <div className="p-10 text-center">대회를 찾을 수 없습니다.</div>;
  }

  // 공통 탭 버튼 스타일
  const getTabClass = (tabName: string) => {
    const isActive = activeTab === tabName;
    return `
      w-32 py-3 text-center text-sm  transition-all duration-200 relative
      ${isActive ? 'font-bold' : 'font-medium'}
    `;
  };

  return (
    <div className="max-w-7xl mx-auto px-30 pt-8 pb-0 ">
      {eventDetails && (
        <div className="flex flex-col lg:flex-row gap-8 ">
          {/* 좌측: 대회 상세 정보 영역 */}
          <div className="flex-1">
            <EventThumbnail />

            {/* 구분선 */}
            <div className="py-2"></div>

            <div className="p-2 ">
              <div className="w-full">
                {/* 탭 메뉴: 왼쪽 정렬 및 탭 간 간격 설정 */}
                <div className="flex border-b border-gray-200 mb-6">
                  <Button
                    variant="text"
                    onClick={() => setActiveTab('product')}
                    className={cn(
                      getTabClass('product'),
                      'flex-1 relative rounded-none py-4',
                    )}
                  >
                    상세정보
                    {/* 활성화 시 나타나는 언더바 */}
                    {activeTab === 'product' && (
                      <div className="absolute bottom-0 w-full left-0 h-0.5 bg-black transition-all" />
                    )}
                  </Button>
                  <Button
                    variant="text"
                    onClick={() => setActiveTab('sales')}
                    className={cn(
                      getTabClass('sales'),
                      'flex-1 relative rounded-none py-4',
                    )}
                  >
                    판매정보
                    {/* 활성화 시 나타나는 언더바 */}
                    {activeTab === 'sales' && (
                      <div className="absolute bottom-0 w-full left-0 h-0.5 bg-black transition-all" />
                    )}
                  </Button>
                </div>

                {/* 메인 컨텐츠 영역 */}
                <div className="p-2">
                  {/* 상품정보 탭 */}
                  <div className={activeTab === 'product' ? 'block' : 'hidden'}>
                    <EventProductInfo />
                  </div>
                  {/* 판매정보 탭 */}
                  <div className={activeTab === 'sales' ? 'block' : 'hidden'}>
                    <EventSalesInfo />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 우측: 참여 정보 카드 (Sidebar) */}
          <div className="w-full lg:w-[360px]">
            {/* [데모/관리] 대기열 토글 + 재고/신청 초기화 */}
            <EventAdminPanel eventId={String(params.id)} />
            <div
              className={cn(!actionCard && !resultCard && 'sticky top-5 h-fit')}
            >
              <EventEntryInfo
                actionCard={actionCard}
                setActionCard={setActionCard}
                resultCard={resultCard}
                setResultCard={setResultCard}
              />
            </div>
            {actionCard && (
              <div className={cn(actionCard && 'sticky top-5 h-fit')}>
                <ActionCardPage
                  actionCard={actionCard}
                  setActionCard={setActionCard}
                  setIsUserModalOpen={setIsUserModalOpen}
                  onStart={handleStart}
                />
              </div>
            )}
            {resultCard && (
              <div className={cn(resultCard && 'sticky top-5 h-fit')}>
                <ResultCardPage setResultCard={setResultCard} />
              </div>
            )}
          </div>

          {/* 사용자 정보 확인 Modal */}
          <EntryConfirmModal
            isUserModalOpen={isUserModalOpen}
            setIsUserModalOpen={setIsUserModalOpen}
            onStop={handleStop}
          />
        </div>
      )}
    </div>
  );
}
