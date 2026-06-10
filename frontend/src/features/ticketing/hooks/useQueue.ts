// features/ticketing/hooks/useQueue.ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ticketingService } from '../services';
import { QueueStatus } from '../types';
import { useEventStore } from '@/features/event/store/useEventStore';
import { parseEntryError, EntryErrorInfo } from '../lib/entryErrorHandler';

/**
 * 대기열 진입 + 폴링 훅 (실연동, StrictMode 안전).
 * - 마운트 시 (데모 주입 →) enter → 백엔드 retryAfterMs 주기로 status 폴링.
 * - PASS 수신 시 passToken 을 스토어에 저장하고 폴링을 멈춘다.
 * - QUE_001(대기열 미활성)·QUE_003(미존재) 등은 error 로 노출해 호출측이 분기한다.
 *
 * 폴링/입장 취소는 each-effect-run 로컬 `cancelled` 로 처리해
 * StrictMode 이중 실행에도 마지막 실행의 폴링만 살아남도록 한다.
 * 시드 주입과 stopPolling 상태는 인스턴스 ref 로 1회/지속 보장한다.
 */
export const useQueue = () => {
  const paceId = useEventStore((s) => s.paceId);
  const botClearToken = useEventStore((s) => s.botClearToken);
  const setPassToken = useEventStore((s) => s.setPassToken);
  const demoSeedCount = useEventStore((s) => s.demoSeedCount);
  const setDemoSeedCount = useEventStore((s) => s.setDemoSeedCount);

  const [status, setStatus] = useState<QueueStatus | null>(null);
  const [error, setError] = useState<EntryErrorInfo | null>(null);
  const [isStoppedByUser, setIsStoppedByUser] = useState(false);

  const seededRef = useRef(false);
  const stoppedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialPositionRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const stopPolling = useCallback(() => {
    stoppedRef.current = true;
    setIsStoppedByUser(true);
    clearTimer();
  }, []);

  const leave = useCallback(async () => {
    if (paceId == null) return;
    try {
      await ticketingService.leaveQueue({ paceId }, { botToken: botClearToken });
    } catch {
      // 이탈 실패(QUE_003 등)는 무시 — 이미 없는 사용자
    }
  }, [paceId, botClearToken]);

  useEffect(() => {
    if (paceId == null) {
      setError({
        code: 'NO_PACE',
        status: 0,
        message: '코스·페이스 정보가 없습니다.',
      });
      return;
    }

    let cancelled = false;
    const opts = { botToken: botClearToken };

    const poll = async () => {
      if (cancelled || stoppedRef.current) return;
      try {
        const res = await ticketingService.getQueueStatus({ paceId }, opts);
        if (cancelled || stoppedRef.current) return;
        if (res.success) {
          const data = res.data;
          if (
            data.status === 'WAITING' &&
            data.position != null &&
            initialPositionRef.current == null
          ) {
            initialPositionRef.current = data.position;
          }
          setStatus(data);

          if (data.status === 'PASS') {
            if (data.passToken) setPassToken(data.passToken);
            return; // 통과 → 폴링 종료
          }
          timerRef.current = setTimeout(poll, data.retryAfterMs ?? 3000);
        }
      } catch (e) {
        if (cancelled || stoppedRef.current) return;
        setError(parseEntryError(e));
      }
    };

    const run = async () => {
      // [데모] 진입 직전 1회 주입 (StrictMode 이중 실행에도 1회만)
      if (demoSeedCount != null && demoSeedCount > 0 && !seededRef.current) {
        seededRef.current = true;
        try {
          await ticketingService.seedQueue({ paceId, count: demoSeedCount });
        } catch {
          // 데모 주입 실패는 진입을 막지 않음
        }
        setDemoSeedCount(null);
      }
      if (cancelled || stoppedRef.current) return;

      try {
        await ticketingService.enterQueue({ paceId }, opts);
      } catch (e) {
        const info = parseEntryError(e);
        // QUE_002(이미 진입) → 그대로 폴링 진행, 그 외는 에러 노출
        if (info.code !== 'QUE_002') {
          if (!cancelled) setError(info);
          return;
        }
      }
      poll();
    };

    run();

    return () => {
      cancelled = true;
      clearTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paceId]);

  const progress = (() => {
    if (status?.status === 'PASS') return 100;
    const init = initialPositionRef.current;
    const pos = status?.position;
    if (init == null || pos == null || init <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round(((init - pos) / init) * 100)));
  })();

  return { status, error, progress, stopPolling, leave, isStoppedByUser };
};
