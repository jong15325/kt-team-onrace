'use client';

import { Button } from '@/components/ui/button';
import {
  EventHistoryPage,
  PaymentHistoryPage,
  AccountSettings,
  CustomerSupport,
} from '@/features/mypage/components';
import { cn } from '@/lib/utils';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const menuItems = [
  { id: 'account', label: '회원정보 수정' },
  { id: 'event', label: '신청내역' },
  { id: 'payment', label: '결제내역' },
  { id: 'support', label: '고객지원' },
];

function MyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 탭 상태를 URL(?tab=)에서 파생 → 상세 진입 후 뒤로가기 시 직전 탭으로 복귀
  const tabParam = searchParams.get('tab');
  const activeTab = menuItems.some((item) => item.id === tabParam)
    ? (tabParam as string)
    : 'account';

  // 탭 전환은 replace(히스토리 누적 방지), 상세 진입(push)만 뒤로가기 대상이 됨
  const handleTab = (id: string) => {
    router.replace(`/mypage?tab=${id}`);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'account':
        return <AccountSettings />;
      case 'event':
        return <EventHistoryPage />;
      case 'payment':
        return <PaymentHistoryPage />;
      case 'support':
        return <CustomerSupport />;
      default:
        return <AccountSettings />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-30 my-10  flex flex-col gap-8 min-h-screen">
      <header className="text-black ">
        <h2 className="text-3xl font-bold">마이페이지</h2>
        <div className="my-2 h-[2px] bg-black"></div>
      </header>

      <div className="flex flex-row gap-8">
        {/* 왼쪽 사이드바 메뉴 */}

        <nav className="flex flex-col">
          {menuItems.map((item) => (
            <Button
              key={item.id}
              variant="text"
              className={cn(
                'text-lg justify-start px-0',
                activeTab === item.id && 'font-bold',
              )}
              onClick={() => handleTab(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </nav>

        {/* 오른쪽 콘텐츠 영역 */}
        <section className="flex-1 rounded-sm bg-white">{renderContent()}</section>
      </div>
    </div>
  );
}

export default function MyPage() {
  // useSearchParams 사용 시 App Router 정적 렌더 경계용 Suspense 필요
  return (
    <Suspense fallback={null}>
      <MyPageContent />
    </Suspense>
  );
}
