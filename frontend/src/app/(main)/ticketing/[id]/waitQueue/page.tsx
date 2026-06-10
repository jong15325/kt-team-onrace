'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQueue } from '@/features/ticketing/hooks';
import { QueueStatusCard } from '@/features/ticketing/components';
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { LuCircleAlert } from 'react-icons/lu';
import { useEventStore } from '@/features/event/store/useEventStore';
import { eventService } from '@/features/event/services';
import { handleEntryError } from '@/features/ticketing/lib/entryErrorHandler';

export default function WaitingPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [openModal, setOpenModal] = useState(false);

  const { status, error, progress, stopPolling, leave, isStoppedByUser } =
    useQueue();

  const { courseId, paceId, botClearToken } = useEventStore();
  const appliedRef = useRef(false);

  // 대기열 통과(PASS) → 선착순 신청 → 결제 페이지 이동
  useEffect(() => {
    const apply = async (passToken?: string | null) => {
      if (appliedRef.current) return;
      if (courseId == null || paceId == null) {
        router.replace(`/ticketing/${eventId}`);
        return;
      }
      appliedRef.current = true;
      try {
        const res = await eventService.applyEventFirstCome(
          eventId,
          { courseId, paceId },
          { botToken: botClearToken, passToken },
        );
        if (res.success) {
          router.replace(`/ticketing/${eventId}/payment`);
        }
      } catch (e) {
        appliedRef.current = false;
        handleEntryError(e, { router, eventId });
      }
    };

    if (status?.status === 'PASS') {
      apply(status.passToken);
    }
  }, [status, courseId, paceId, botClearToken, eventId, router]);

  // 대기열 에러 분기
  useEffect(() => {
    if (!error) return;
    // 해당 페이스 대기열이 비활성(QUE_001) → 대기열 없이 바로 선착순 신청
    if (error.code === 'QUE_001') {
      if (appliedRef.current || courseId == null || paceId == null) return;
      appliedRef.current = true;
      eventService
        .applyEventFirstCome(
          eventId,
          { courseId, paceId },
          { botToken: botClearToken },
        )
        .then((res) => {
          if (res.success) router.replace(`/ticketing/${eventId}/payment`);
        })
        .catch((e) => {
          appliedRef.current = false;
          handleEntryError(e, { router, eventId });
        });
      return;
    }
    // 그 외(QUE_003/NO_PACE 등) → 표준 처리(상세/안내)
    handleEntryError(
      { response: { status: error.status, data: { code: error.code, message: error.message } } },
      { router, eventId },
    );
  }, [error, courseId, paceId, botClearToken, eventId, router]);

  const handleCancelRequest = async () => {
    stopPolling();
    await leave();
    router.push('/event');
  };

  if (!status && !isStoppedByUser && !error) {
    return <div className="text-center p-10">대기열 확인 중...</div>;
  }

  return (
    <main className="flex flex-col items-center justify-center p-6 space-y-4">
      {/* 대기열 카드 UI */}
      {!isStoppedByUser && status?.status === 'WAITING' && (
        <QueueStatusCard
          status={status}
          progress={progress}
          onCancel={() => setOpenModal(true)}
        />
      )}

      <Modal open={openModal} onOpenChange={setOpenModal}>
        <ModalContent size="lg">
          <ModalHeader className="py-4 text-left">
            <LuCircleAlert
              size={50}
              className="text-font-error block mx-auto mb-6"
            />
            <ModalTitle className="text-3xl font-bold text-left">
              대기를 취소하시겠습니까?
            </ModalTitle>
            <ModalDescription className="text-font-medium text-left">
              현재 대기 순번
              <span className="font-bold">{' ' + (status?.position ?? '-')}</span>
              번이 삭제됩니다.
              <br />
              취소 후 다시 대기하시면 마지막 순번으로 배정되어 대기 시간이
              길어질 수 있습니다.
            </ModalDescription>
          </ModalHeader>

          <ModalFooter>
            <ModalClose asChild>
              <Button variant="secondary" rounded="full">
                돌아가기
              </Button>
            </ModalClose>
            <Button
              variant="primary1"
              rounded="full"
              onClick={handleCancelRequest}
            >
              대기 취소
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </main>
  );
}
