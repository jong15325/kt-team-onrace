import { ApiResponse } from '@/types/api';
import { EnterQueue, QueueStatus, QueueSeed } from '../types';

/** 봇 통과 토큰 옵션 (Bot-Clear-Token 패스스루) */
export interface BotTokenOption {
  botToken?: string | null;
}

export interface BotClearToken {
  botClearToken: string;
}

export interface ITicketingService {
  /** 봇 통과 토큰 발급 (현재 백엔드는 테스트용 더미 토큰) */
  getBotClearToken(): Promise<ApiResponse<BotClearToken>>;
  enterQueue(
    data: { paceId: number },
    opts?: BotTokenOption,
  ): Promise<ApiResponse<EnterQueue>>;
  getQueueStatus(
    data: { paceId: number },
    opts?: BotTokenOption,
  ): Promise<ApiResponse<QueueStatus>>;
  leaveQueue(
    data: { paceId: number },
    opts?: BotTokenOption,
  ): Promise<ApiResponse<null>>;
  /** [데모] 테스트 사용자(가짜 대기자) 주입 */
  seedQueue(data: { paceId: number; count: number }): Promise<
    ApiResponse<QueueSeed>
  >;
}
