import { wrapMockResponse } from '@/utils/api';
import { ITicketingService } from './interface';
import { QUEUE_STATUS } from '@/mockups';

export const ticketingMock: ITicketingService = {
  getBotClearToken: async () =>
    wrapMockResponse({ botClearToken: 'MOCK_BOT_CLEAR_TOKEN' }),
  enterQueue: async () => wrapMockResponse({ paceId: 3, position: 142 }),
  getQueueStatus: async () => wrapMockResponse(QUEUE_STATUS),
  leaveQueue: async () => wrapMockResponse(),
  seedQueue: async (data) =>
    wrapMockResponse({ paceId: data.paceId, seeded: data.count, waiting: data.count }),
};
