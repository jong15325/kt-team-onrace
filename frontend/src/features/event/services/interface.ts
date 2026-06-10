import { ApiResponse } from '@/types/api';
import {
  EventList,
  EventDetails,
  SalesInfo,
  EventOverview,
  EventRate,
  EventPrevSave,
  EventApply,
  EventStockCheck,
  EventReset,
  Event,
  EventSearchQuery,
} from '../types';

/**
 * 신청/대기열 호출 시 함께 전달하는 토큰 헤더 옵션.
 * - botToken → Bot-Clear-Token (봇 통과 토큰)
 * - passToken → X-Queue-Token (대기열 통과 토큰, 선착순 대기열 ON일 때만)
 */
export interface EntryTokenOptions {
  botToken?: string | null;
  passToken?: string | null;
}

export interface IEventService {
  getEvents(data?: EventSearchQuery): Promise<ApiResponse<EventList>>;
  getEventById(id: string): Promise<ApiResponse<Event>>;
  getEventDetails(id: string): Promise<ApiResponse<EventDetails>>;
  getSalesInfo(id: string): Promise<ApiResponse<SalesInfo>>;
  postStockInit(id: string): Promise<ApiResponse<null>>;
  postEventReset(id: string): Promise<ApiResponse<EventReset>>;
  postQueueEnable(id: string): Promise<ApiResponse<null>>;
  postQueueDisable(id: string): Promise<ApiResponse<null>>;
  getQueueEnable(): Promise<ApiResponse<number[]>>;
  getEventOverview(id: string): Promise<ApiResponse<EventOverview>>;
  getEventRate(
    id: string,
    data: { courseId: number; paceId: number },
  ): Promise<ApiResponse<EventRate>>;
  postEventPreSave(
    id: string,
    data: { courseId: number; paceId: number },
  ): Promise<ApiResponse<EventPrevSave>>;
  deleteEventPreSave(id: string): Promise<ApiResponse<null>>;
  stockCheck(
    id: string,
    data: { paceId: number },
    opts?: EntryTokenOptions,
  ): Promise<ApiResponse<EventStockCheck>>;
  applyEventLottery(
    id: string,
    data: { courseId: number; paceId: number },
    opts?: EntryTokenOptions,
  ): Promise<ApiResponse<EventApply>>;
  applyEventFirstCome(
    id: string,
    data: { courseId: number; paceId: number },
    opts?: EntryTokenOptions,
  ): Promise<ApiResponse<EventApply>>;
}
