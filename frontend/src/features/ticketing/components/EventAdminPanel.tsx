'use client';

import { useState } from 'react';
import { eventService } from '@/features/event/services';
import { Button } from '@/components/ui/button';
import { QueueAdminToggle } from './QueueAdminToggle';

/**
 * [데모/관리] 상세 페이지 데모 컨트롤 패널.
 * - 대기열 ON/OFF 토글
 * - 재고 초기화 (Redis 재고 카운터 재설정)
 * - 신청 초기화 (신청+재고+대기열 전체 리셋 — 파괴적)
 *
 * ※ 포트폴리오 데모용. 실제 운영이라면 관리자 권한으로 제한 필요.
 */
export function EventAdminPanel({ eventId }: { eventId: string }) {
  const [loading, setLoading] = useState<null | 'stock' | 'reset'>(null);

  const handleStockInit = async () => {
    if (loading) return;
    setLoading('stock');
    try {
      const res = await eventService.postStockInit(eventId);
      if (res.success) alert('재고를 초기화했습니다.');
    } catch {
      alert('재고 초기화에 실패했습니다.');
    } finally {
      setLoading(null);
    }
  };

  const handleReset = async () => {
    if (loading) return;
    if (
      !confirm(
        '이 이벤트의 신청·재고·대기열을 모두 초기화합니다.\n계속하시겠습니까?',
      )
    )
      return;
    setLoading('reset');
    try {
      const res = await eventService.postEventReset(eventId);
      if (res.success) {
        alert(
          `초기화 완료 — 삭제된 신청 ${res.data.deletedEntries}건, 재설정 페이스 ${res.data.resetPaces}개`,
        );
      }
    } catch {
      alert('신청 초기화에 실패했습니다.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mb-3 space-y-2">
      <QueueAdminToggle eventId={eventId} />
      <div className="flex gap-2 rounded-md border border-dashed border-amber-300 bg-amber-50 px-3 py-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={handleStockInit}
          disabled={loading !== null}
        >
          {loading === 'stock' ? '초기화 중…' : '재고 초기화'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={handleReset}
          disabled={loading !== null}
        >
          {loading === 'reset' ? '초기화 중…' : '신청 초기화'}
        </Button>
      </div>
    </div>
  );
}
