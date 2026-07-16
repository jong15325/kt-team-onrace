// [DEPRECATED] 과거 대기열 Mock. 현재는 useQueue 훅이 ticketingService.getQueueStatus(실 API)를
// 직접 폴링하므로 더 이상 사용하지 않는다. 호환을 위해 실 서비스로 위임한다.
import { ticketingService } from './index';

export const getQueueStatus = async (paceId: number) => {
  const res = await ticketingService.getQueueStatus({ paceId });
  return res.data;
};
