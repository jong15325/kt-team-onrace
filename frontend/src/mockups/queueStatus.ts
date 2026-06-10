import { QueueStatus } from '@/features/ticketing/types';

export const QUEUE_STATUS: QueueStatus = {
  paceId: 3,
  status: 'WAITING',
  position: 87,
  totalWaiting: 200,
  expectedWaitTime: 10000,
  passToken: null,
  retryAfterMs: 3000,
};
