import { apiClient } from '@/lib/apiClient';
import { IEventService, EntryTokenOptions } from './interface';

/** 토큰 옵션을 실제 요청 헤더로 변환 (브라우저→BFF, BFF가 백엔드로 패스스루) */
const tokenHeaders = (opts?: EntryTokenOptions) => {
  const headers: Record<string, string> = {};
  if (opts?.botToken) headers['Bot-Clear-Token'] = opts.botToken;
  if (opts?.passToken) headers['X-Queue-Token'] = opts.passToken;
  return headers;
};

export const eventApi: IEventService = {
  getEvents: async (data) => {
    const response = await apiClient.get('/events', { params: data });
    return response.data;
  },
  getEventById: async (id) => {
    const response = await apiClient.get(`/events/${id}/info`);
    return response.data;
  },
  getEventDetails: async (id) => {
    const response = await apiClient.get(`/events/${id}`);
    return response.data;
  },
  getSalesInfo: async (id) => {
    const response = await apiClient.get(`/events/${id}/sales-info`);
    return response.data;
  },

  postStockInit: async (id) => {
    const response = await apiClient.post(`/events/${id}/stock/init`);
    return response.data;
  },
  postEventReset: async (id) => {
    const response = await apiClient.post(`/events/${id}/reset`);
    return response.data;
  },
  postQueueEnable: async (id) => {
    const response = await apiClient.post(`/events/${id}/queue/enable`);
    return response.data;
  },
  postQueueDisable: async (id) => {
    const response = await apiClient.post(`/events/${id}/queue/disable`);
    return response.data;
  },
  getQueueEnable: async () => {
    const response = await apiClient.get('/events/queue-enabled');
    return response.data;
  },
  getEventOverview: async (id) => {
    const response = await apiClient.get(`/events/${id}/entries/overview`);
    return response.data;
  },
  getEventRate: async (id, data) => {
    const response = await apiClient.get(`/events/${id}/entries/rate`, {
      params: data,
    });
    return response.data;
  },
  postEventPreSave: async (id, data) => {
    const response = await apiClient.post(
      `/events/${id}/entries/pre-save`,
      data,
    );
    return response.data;
  },
  deleteEventPreSave: async (id) => {
    const response = await apiClient.delete(`/events/${id}/entries/pre-save`);
    return response.data;
  },
  stockCheck: async (id, data, opts) => {
    const response = await apiClient.get(`/events/${id}/entries/stock-check`, {
      params: data,
      headers: tokenHeaders(opts),
    });
    return response.data;
  },
  applyEventLottery: async (id, data, opts) => {
    const response = await apiClient.post(
      `/events/${id}/entries/apply/lottery`,
      data,
      { headers: tokenHeaders(opts) },
    );
    return response.data;
  },
  applyEventFirstCome: async (id, data, opts) => {
    const response = await apiClient.post(
      `/events/${id}/entries/apply/first-come`,
      data,
      { headers: tokenHeaders(opts) },
    );
    return response.data;
  },
};
