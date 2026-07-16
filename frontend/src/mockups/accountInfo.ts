import { AccountInfo } from '@/features/mypage/types/accountInfo';

export const MOCK_ACCOUNT_INFO: AccountInfo = {
  id: 1,
  name: '김유저',
  phoneNumber: '01012345678',
  email: 'user@email.com',
  isPassAuth: false,
  addressList: [
    {
      id: 1,
      label: '우리집',
      receiverName: '김유저',
      phoneNumber: '01012345678',
      zipcode: '12345',
      address1: '서울특별시 강남구 테헤란로 123',
      address2: '좋은아파트 102동 304호',
      memo: '문앞',
      isDefault: true,
    },
    {
      id: 2,
      label: '회사',
      receiverName: '김유저',
      phoneNumber: '01099998888',
      zipcode: '54321',
      address1: '서울특별시 강남구 테헤란로 123',
      address2: '좋은아파트 102동 304호',
      memo: '경비실',
      isDefault: false,
    },
  ],
};
