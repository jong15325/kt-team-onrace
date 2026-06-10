import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LuChevronLeft } from 'react-icons/lu';
import { EntryOptions } from './EntryOptions';
import { EntryParticipationInfo } from './EntryParticipationInfo';
import { EntryNotice } from './EntryNotice';
import { useEventStore } from '@/features/event/store/useEventStore';
import { eventService } from '@/features/event/services';
import { EventRate } from '@/features/event/types';
import { handleEntryError } from '@/features/ticketing/lib/entryErrorHandler';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function ActionCardPage({
  actionCard,
  setActionCard,
  onStart,
  setIsUserModalOpen,
}: {
  actionCard: boolean;
  setActionCard: React.Dispatch<React.SetStateAction<boolean>>;
  onStart: () => void;
  setIsUserModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { event, courseId, paceId, setQueueEnabled, setDemoSeedCount } =
    useEventStore();
  const router = useRouter();
  const [rate, setRate] = useState<EventRate | null>(null);

  // [데모] 테스트 사용자 대기열 주입 (선착순 전용)
  const [demoSeed, setDemoSeed] = useState(false);
  const [demoCount, setDemoCount] = useState('1000');

  const showRate = event?.appType === 'LOTTERY' && event?.status !== 'READY';

  // 코스/페이스 선택 시 예상 경쟁률 조회 (5초 폴링 — 기획 실시간 요구)
  useEffect(() => {
    if (!showRate || !event?.id || courseId == null || paceId == null) {
      setRate(null);
      return;
    }
    let active = true;
    const fetchRate = () => {
      eventService
        .getEventRate(String(event.id), { courseId, paceId })
        .then((res) => {
          if (active && res.success) setRate(res.data);
        })
        .catch(() => {
          if (active) setRate(null);
        });
    };
    fetchRate();
    const timer = setInterval(fetchRate, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [showRate, event?.id, courseId, paceId]);

  const getHeaderText = () => {
    if (event?.status === 'READY') return '빠른 신청 준비하기';
    if (event?.appType === 'LOTTERY') return '응모하기';
    if (event?.appType === 'FIRST_COME') return '신청하기';
    return '신청하기';
  };

  const getButtonText = () => {
    if (event?.status === 'READY') return '저장하기';
    return '다음 단계로';
  };

  const handleAction = async () => {
    if (courseId == null) return alert('코스를 선택해주세요.');
    if (paceId == null) return alert('목표 페이스를 선택해주세요.');
    if (!event?.id) return;

    const eventId = String(event.id);

    // READY: 사전 정보 저장 (STEP 3-A)
    if (event.status === 'READY') {
      try {
        const res = await eventService.postEventPreSave(eventId, {
          courseId,
          paceId,
        });
        if (res.success) alert('사전 정보가 저장되었습니다.');
      } catch (e) {
        handleEntryError(e, { router, eventId });
      }
      return;
    }

    // LOTTERY(응모)는 재고 예약 개념이 없음 → 재고확인 생략하고 바로 진행
    if (event.appType === 'LOTTERY') {
      setQueueEnabled(false);
      onStart();
      setIsUserModalOpen(true);
      return;
    }

    // STEP 4(선착순): 재고 확인 + 대기열 활성화 여부 판별
    try {
      const res = await eventService.stockCheck(eventId, { paceId });
      if (!res.success) return;
      const { stockStatus, queueEnabled } = res.data;
      setQueueEnabled(queueEnabled);

      if (stockStatus === 'AVAILABLE') {
        // [데모] 주입은 대기열 진입(waitQueue) 직전에 수행하도록 의도만 저장.
        // (신청~진입 사이에 주입하면 그동안 스케줄러가 다 빼내 즉시 통과되는 문제 방지)
        setDemoSeedCount(demoSeed ? Number(demoCount) : null);
        onStart();
        setIsUserModalOpen(true);
      } else if (stockStatus === 'TEMP_SOLD_OUT') {
        alert('일시 품절 상태입니다. 잠시 후 다시 시도해주세요.');
      } else {
        alert('매진되었습니다.');
      }
    } catch (e) {
      handleEntryError(e, { router, eventId });
    }
  };

  return (
    <div className="flex flex-col p-4 border border-gray-200 rounded-sm h-[500px]">
      {/* 상단 스크롤 영역 (flex-1로 남은 공간을 다 차지하게 함) */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 ">
        <div className="flex flex-row items-center">
          <Button
            variant="ghost"
            size="fit"
            onClick={() => setActionCard(false)}
          >
            <LuChevronLeft size={20} />
          </Button>
          <h2 className="text-lg font-bold text-black">{getHeaderText()}</h2>
        </div>

        <EntryOptions />

        {/* [데모] 테스트 사용자 대기열 주입 (선착순 전용) */}
        {event?.appType === 'FIRST_COME' && event?.status !== 'READY' && (
          <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-3 space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="demo-seed"
                variant="primary"
                checked={demoSeed}
                onCheckedChange={() => setDemoSeed((v) => !v)}
              />
              <label
                htmlFor="demo-seed"
                className="text-sm font-semibold text-gray-700 cursor-pointer"
              >
                대기열 데모: 테스트 사용자 주입
              </label>
            </div>
            {demoSeed && (
              <div className="flex items-center gap-2">
                <Select value={demoCount} onValueChange={setDemoCount}>
                  <SelectTrigger variant="default" className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1000">1,000명</SelectItem>
                    <SelectItem value="10000">10,000명</SelectItem>
                    <SelectItem value="30000">30,000명</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-xs text-gray-500">
                  앞줄에 주입 후 본인이 대기·통과
                </span>
              </div>
            )}
            <p className="text-xs text-gray-400">
              ※ 대기열이 활성화된 이벤트에서만 대기 화면이 표시됩니다.
            </p>
          </div>
        )}

        {showRate && (
          <div className="flex">
            <span className="w-28 text-base font-semibold text-black">
              예상 경쟁률
            </span>
            <div>
              <p className="flex-1 font-bold text-2xl">
                {courseId != null && paceId != null && rate
                  ? `${rate.competitionRate}%`
                  : '-'}
              </p>
              <p className="flex-1 text-sm text-gray-500">
                {rate
                  ? `모집 인원 ${rate.capacity}명 / 신청자 ${rate.entryCount}명`
                  : '코스·페이스를 선택해주세요'}
              </p>
            </div>
          </div>
        )}

        {/* 참가 정보 */}
        <EntryParticipationInfo />

        {/* 안내사항 */}
        <EntryNotice />
      </div>

      {/* 하단 버튼 영역 */}
      <div className="px-4 pt-4 border-t">
        <Button
          className="w-full"
          variant="primary1"
          rounded="full"
          onClick={() => handleAction()}
        >
          {getButtonText()}
        </Button>
      </div>
    </div>
  );
}
