import { apiClient } from '@/lib/apiClient';
import { ITicketingService, BotTokenOption } from './interface';

/** 봇 통과 토큰을 요청 헤더로 변환 */
const botHeaders = (opts?: BotTokenOption) =>
  opts?.botToken ? { 'Bot-Clear-Token': opts.botToken } : {};

export const ticketingApi: ITicketingService = {
  getBotClearToken: async () => {
    const response = await apiClient.get('/bot/clear-token');
    return response.data;
  },
  enterQueue: async (data, opts) => {
    const response = await apiClient.post('/queue/enter', data, {
      headers: botHeaders(opts),
    });
    return response.data;
  },
  getQueueStatus: async (data, opts) => {
    const response = await apiClient.get('/queue/status', {
      params: data,
      headers: botHeaders(opts),
    });
    return response.data;
  },
  leaveQueue: async (data, opts) => {
    const response = await apiClient.delete('/queue/leave', {
      params: data,
      headers: botHeaders(opts),
    });
    return response.data;
  },
  seedQueue: async (data) => {
    const response = await apiClient.post('/queue/demo/seed', data);
    return response.data;
  },
};
