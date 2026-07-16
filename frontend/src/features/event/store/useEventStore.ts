import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Event, EventDetails, SalesInfo, EventOverview } from '../types';

interface EventState {
  event: Event | null;
  eventDetails: EventDetails | null;
  eventSaleInfo: SalesInfo | null;
  // 참여 정보(이미 신청 여부/상태) — 상세 진입 시 조회
  eventOverview: EventOverview | null;
  course: string;
  pace: string;
  courseId: number | null;
  paceId: number | null;

  // 신청/대기열 플로우 상태 (토큰은 메모리 전용 — 영속 저장 제외)
  queueEnabled: boolean;
  botClearToken: string | null;
  passToken: string | null;
  // [데모] 대기열 진입 직전 주입할 테스트 사용자 수 (null = 데모 미사용)
  demoSeedCount: number | null;

  selectedBasicOption: string;
  selectedOptions: string[];
  setEvent: (event: Event | null) => void;
  setEventDetails: (eventDetails: EventDetails | null) => void;
  setEventSaleInfo: (eventSaleInfo: SalesInfo | null) => void;
  setEventOverview: (eventOverview: EventOverview | null) => void;
  setCourse: (course: string) => void;
  setPace: (pace: string) => void;
  setCourseId: (courseId: number | null) => void;
  setPaceId: (paceId: number | null) => void;
  setQueueEnabled: (queueEnabled: boolean) => void;
  setBotClearToken: (botClearToken: string | null) => void;
  setPassToken: (passToken: string | null) => void;
  setDemoSeedCount: (demoSeedCount: number | null) => void;
  setSelectedBasicOption: (options: string) => void;
  setSelectedOptions: (options: string[]) => void;
  resetEvent: () => void;
  resetEventDetails: () => void;
  resetTicketing: () => void;
}

export const useEventStore = create<EventState>()(
  persist(
    (set) => ({
      event: null,
      eventDetails: null,
      eventSaleInfo: null,
      eventOverview: null,
      course: '',
      pace: '',
      courseId: null,
      paceId: null,
      queueEnabled: false,
      botClearToken: null,
      passToken: null,
      demoSeedCount: null,
      selectedBasicOption: '',
      selectedOptions: [],
      setEvent: (event) => set({ event }),
      setEventDetails: (eventDetails) => set({ eventDetails }),
      setEventSaleInfo: (eventSaleInfo) => set({ eventSaleInfo }),
      setEventOverview: (eventOverview) => set({ eventOverview }),
      resetEvent: () => set({ event: null, eventOverview: null }),
      resetEventDetails: () => set({ eventDetails: null }),
      setCourse: (course) => set({ course }),
      setPace: (pace) => set({ pace }),
      setCourseId: (courseId) => set({ courseId }),
      setPaceId: (paceId) => set({ paceId }),
      setQueueEnabled: (queueEnabled) => set({ queueEnabled }),
      setBotClearToken: (botClearToken) => set({ botClearToken }),
      setPassToken: (passToken) => set({ passToken }),
      setDemoSeedCount: (demoSeedCount) => set({ demoSeedCount }),
      resetTicketing: () =>
        set({ queueEnabled: false, botClearToken: null, passToken: null }),
      setSelectedBasicOption: (selectedBasicOption) =>
        set({ selectedBasicOption }),
      setSelectedOptions: (options) => set({ selectedOptions: options }),
    }),
    {
      name: 'event-storage',
      storage: createJSONStorage(() => sessionStorage),
      // 보안: 토큰(봇/대기열)은 영속 저장에서 제외(메모리 전용)
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(
            ([key]) => !['botClearToken', 'passToken'].includes(key),
          ),
        ) as EventState,
    },
  ),
);
