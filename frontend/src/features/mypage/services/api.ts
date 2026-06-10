import { apiClient } from '@/lib/apiClient';
import { IMypageService } from './interface';
import { EntryHistoryItem } from '../types';
import { mapEntryHistoryItem } from '../lib/entryStatusLabel';

export const mypageApi: IMypageService = {
  getAccountInfo: async () => {
    const response = await apiClient.get('/mypage/accountInfo');
    return response.data;
  },
  getHistoryOverview: async () => {
    const response = await apiClient.get(`/mypage`);
    return response.data;
  },
  getEntriesHistory: async () => {
    const response = await apiClient.get(`/mypage/entries`);
    const body = response.data; // ApiResponse<EntryHistoryItem[]>
    const items: EntryHistoryItem[] = body?.data ?? [];
    // 백엔드 원시 enum → 화면용 EntriesHistory(표시 문자열 포함)로 매핑
    return { ...body, data: items.map(mapEntryHistoryItem) };
  },
  getWaitingHistory: async () => {
    const response = await apiClient.get(`/mypage/waiting-entries`);
    return response.data;
  },
  getOrderHistory: async () => {
    const response = await apiClient.get(`/mypage/orders`);
    return response.data;
  },
  getOrderDetailInfo: async (id) => {
    const response = await apiClient.get(`/mypage/orders/${id}`);
    return response.data;
  },
};
