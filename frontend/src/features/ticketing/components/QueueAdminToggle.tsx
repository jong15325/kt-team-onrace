'use client';

import { useEffect, useState } from 'react';
import { eventService } from '@/features/event/services';
import { Checkbox } from '@/components/ui/checkbox';

/**
 * [데모/관리] 이벤트 대기열 ON/OFF 토글.
 * - 초기 상태: GET /events/queue-enabled 에 현재 eventId 포함 여부
 * - 토글: POST /events/{id}/queue/{enable|disable}
 * ※ 포트폴리오 데모용 컨트롤. 실제 운영이라면 관리자 권한으로 제한해야 함.
 */
export function QueueAdminToggle({ eventId }: { eventId: string }) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    eventService
      .getQueueEnable()
      .then((res) => {
        if (res.success) setEnabled(res.data.includes(Number(eventId)));
      })
      .catch(() => {});
  }, [eventId]);

  const toggle = async () => {
    if (loading) return;
    setLoading(true);
    const next = !enabled;
    try {
      const res = next
        ? await eventService.postQueueEnable(eventId)
        : await eventService.postQueueDisable(eventId);
      if (res.success) setEnabled(next);
    } catch {
      alert('대기열 설정 변경에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="mb-3 flex items-center justify-between rounded-md border border-dashed border-amber-300 bg-amber-50 px-3 py-2">
      <div className="flex items-center gap-2">
        <Checkbox
          id="queue-admin-toggle"
          variant="primary"
          checked={enabled}
          onCheckedChange={toggle}
          disabled={loading}
        />
        <label
          htmlFor="queue-admin-toggle"
          className="cursor-pointer text-sm font-semibold text-amber-700"
        >
          대기열 {enabled ? 'ON' : 'OFF'} (데모 관리)
        </label>
      </div>
      <span className="text-xs text-amber-500">
        {loading ? '변경 중…' : enabled ? '활성화됨' : '비활성'}
      </span>
    </div>
  );
}
