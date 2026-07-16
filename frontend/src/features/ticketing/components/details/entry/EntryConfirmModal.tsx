'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { UserConfirmModal } from './UserConfirmModal';
import { AgreeConfirmModal } from './AgreeConfirmModal';
import { myPageService } from '@/features/mypage/services';
// import { VqaModal } from './VqaModal';

export function EntryConfirmModal({
  isUserModalOpen,
  setIsUserModalOpen,
  onStop,
}: {
  isUserModalOpen: boolean;
  setIsUserModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onStop: () => void;
}) {
  // 하이드레이션 오류 방지를 위한 마운트 상태 관리
  const params = useParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const [isAgreeModalOpen, setIsAgreeModalOpen] = useState(false);
  // const [isVqaModalOpen, setIsVqaModalOpen] = useState(false);

  const [userData, setUserData] = useState({
    name: '-',
    birthDate: '-',
    gender: '-',
    phone: '-',
    email: '-',
  });

  // 컴포넌트가 마운트된 후에만 렌더링을 허용 + 참가자 정보 조회
  useEffect(() => {
    setMounted(true);
    myPageService
      .getAccountInfo()
      .then((res) => {
        if (res.success) {
          const formatPhone = (p?: string) =>
            p
              ? p
                  .replace(/[^0-9]/g, '')
                  .replace(/^(\d{2,3})(\d{3,4})(\d{4})$/, '$1-$2-$3')
              : '-';
          setUserData({
            name: res.data.name ?? '-',
            birthDate: '-', // account API 미노출
            gender: '-', // account API 미노출
            phone: formatPhone(res.data.phoneNumber),
            email: res.data.email ?? '-',
          });
        }
      })
      .catch(() => {});
  }, []);

  // 아직 마운트되지 않았다면 껍데기(Skeleton) 혹은 null 반환
  if (!mounted) {
    return <div className="mb-6 min-h-[100px]" />; // 레이아웃 시프트를 방지하기 위해 최소 높이 설정
  }

  const handleApply = () => {
    onStop();
    router.push(`/ticketing/${params.id}/vqa`);
  };

  return (
    <section>
      <UserConfirmModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onConfirm={() => {
          setIsUserModalOpen(false);
          setIsAgreeModalOpen(true);
        }}
        data={userData}
      />
      <AgreeConfirmModal
        isOpen={isAgreeModalOpen}
        onClose={() => setIsAgreeModalOpen(false)}
        onConfirm={() => {
          setIsAgreeModalOpen(false);
          handleApply();
        }}
      />
      {/* <VqaModal
        isOpen={isVqaModalOpen}
        onClose={() => setIsVqaModalOpen(false)}
        onConfirm={() => {
          setIsVqaModalOpen(false);
          handleApply();
        }}
      /> */}
    </section>
  );
}
