import { mypageApi } from './api';
import { mypageMock } from './mock';

// 회원정보(getAccountInfo)·신청내역(getEntriesHistory)은 실연동, 나머지(대기/주문)는 아직 mock
export const myPageService = {
  ...mypageMock,
  getAccountInfo: mypageApi.getAccountInfo,
  getEntriesHistory: mypageApi.getEntriesHistory,
};
