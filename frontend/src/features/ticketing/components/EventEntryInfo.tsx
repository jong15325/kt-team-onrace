'use client';

import { useEffect, useState } from 'react';
import { getStatusConfig, getStatusLabel } from '@/types/constants';
import { Button } from '@/components/ui/button';
import { LuShare } from 'react-icons/lu';
import { EntryInfo } from './details/entry';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/modal';
import { useRouter } from 'next/navigation';
import { useEventStore } from '@/features/event/store/useEventStore';

export function EventEntryInfo({
  actionCard,
  setActionCard,
  resultCard,
  setResultCard,
}: {
  actionCard: boolean;
  setActionCard: React.Dispatch<React.SetStateAction<boolean>>;
  resultCard: boolean;
  setResultCard: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  // 하이드레이션 오류 방지를 위한 마운트 상태 관리
  const { status } = useSession();
  const { event, eventOverview, setCourseId, setPaceId } = useEventStore();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [openModal, setOpenModal] = useState(false);

  const isClosed = event?.status === 'DRAW_COMPLETED';
  const isEntry = event?.appType === 'LOTTERY' && isClosed;

  // 컴포넌트가 마운트된 후에만 렌더링을 허용
  useEffect(() => {
    setMounted(true);
  }, []);

  const displayStatusLabel = (status: string) => {
    let displayLabel = '';

    switch (status) {
      case 'READY':
        const dateStr = '2026-03-15T09:00:00';
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

  const getHeaderText = () => {
    if (event?.status === 'READY') return '빠른 신청 준비하기';
    if (event?.appType === 'LOTTERY') return '응모하기';
    if (event?.appType === 'FIRST_COME') return '신청하기';
    return '신청하기';
  };

  // 이미 신청한 entry (이벤트당 1건). overview로 진입 시 조회됨.
  const entry = eventOverview?.hasEntry ? eventOverview.entry : null;
  const entryStatus = entry?.status;
  // APPLIED(신청완료)/LOST(미당첨) → 신청 불가, RESERVED(미결제)/WON(당첨) → 결제 이어가기
  const isAlreadyDone = entryStatus === 'APPLIED' || entryStatus === 'LOST';
  const isPayable = entryStatus === 'RESERVED' || entryStatus === 'WON';

  const doneLabel = () => {
    if (entryStatus === 'LOST') return '미당첨';
    return event?.appType === 'LOTTERY' ? '응모 완료' : '신청 완료';
  };

  const handelShowActionCard = () => {
    if (status === 'unauthenticated') {
      setOpenModal(true);
      return;
    }
    setActionCard((prev) => !prev);
  };

  // RESERVED/WON → 기존 신청의 코스/페이스로 결제 이어가기
  const handleResumePayment = () => {
    if (status === 'unauthenticated') {
      setOpenModal(true);
      return;
    }
    if (entry) {
      setCourseId(entry.selectedCourseId);
      setPaceId(entry.selectedPaceId);
    }
    router.push(`/ticketing/${event?.id}/payment`);
  };
  const handelShowResultCard = () => {
    if (status === 'unauthenticated') {
      setOpenModal(true);
      return;
    }
    setResultCard((prev) => !prev);
  };

  // 아직 마운트되지 않았다면 껍데기(Skeleton) 혹은 null 반환
  if (!mounted) {
    return <div className="mb-6 min-h-[100px]" />; // 레이아웃 시프트를 방지하기 위해 최소 높이 설정
  }

  return (
    <div className="flex flex-col">
      <div className="flex gap-2">
        <div
          className={cn(
            'text-sm font-semibold px-3 py-1 rounded-sm',
            getStatusConfig(event?.status || ''),
          )}
        >
          {displayStatusLabel(event?.status || '')}
        </div>
      </div>
      <div className="flex flex-row items-center justify-between mb-8">
        <h1 className="text-4xl font-bold ">{event?.title}</h1>
        <Button variant="ghost" size="icon">
          <LuShare />
        </Button>
      </div>

      {/* 정보 리스트 */}
      <EntryInfo />

      {/* 선택 옵션 및 버튼 */}
      <div className="mt-auto space-y-3">
        {!actionCard && !isEntry && (
          <div>
            {isAlreadyDone ? (
              <Button variant="primary1" rounded="full" disabled>
                {doneLabel()}
              </Button>
            ) : isPayable ? (
              <Button
                variant="primary1"
                rounded="full"
                onClick={handleResumePayment}
              >
                결제하기
              </Button>
            ) : (
              <Button
                disabled={
                  event?.status === 'DRAW_COMPLETED' || event?.status === 'END'
                }
                variant="primary1"
                rounded="full"
                onClick={handelShowActionCard}
              >
                {getHeaderText()}
              </Button>
            )}
          </div>
        )}

        {!resultCard && isEntry && (
          <div>
            <Button
              variant="primary1"
              rounded="full"
              onClick={handelShowResultCard}
            >
              결과보기
            </Button>
          </div>
        )}
      </div>
      <div>
        <Modal open={openModal} onOpenChange={setOpenModal}>
          {/* cva를 통해 정의한 size="lg" 적용 */}
          <ModalContent size="md" className="">
            <ModalHeader className="py-2">
              <ModalTitle className="text-3xl font-bold">
                로그인이 필요합니다
              </ModalTitle>
              <ModalDescription className="text-font-medium">
                이벤트 참가 신청은 로그인 회원만 가능합니다.
                <br />
                로그인 후 다시 진행해 주세요.
              </ModalDescription>
            </ModalHeader>

            <ModalFooter>
              <ModalClose asChild>
                <Button variant="secondary" rounded="full">
                  취소
                </Button>
              </ModalClose>
              <Button
                variant="primary1"
                rounded="full"
                onClick={() => router.push('/login')}
              >
                로그인 하기
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </div>
    </div>
  );
}
