'use client';

import { useEventStore } from '@/features/event/store/useEventStore';
import { DetailImg } from '@/features/event/types';
import { useEffect, useState } from 'react';
import { MdImage } from 'react-icons/md';

export function EventDetailsInfo() {
  // 하이드레이션 오류 방지를 위한 마운트 상태 관리
  const [mounted, setMounted] = useState<boolean>(false);
  const [detailImg, setDetailImg] = useState<DetailImg>();

  const { eventDetails } = useEventStore();

  // 컴포넌트가 마운트된 후에만 렌더링을 허용
  useEffect(() => {
    setMounted(true);
  }, []);

  // 데이터 로드
  useEffect(() => {
    const fetchData = async () => {
      if (!mounted) return;

      const detailImgList = eventDetails?.detailImg ?? [];
      if (detailImgList && detailImgList.length > 0) {
        setDetailImg(detailImgList[0]);
      }
    };

    fetchData();
  }, [mounted]);

  // 아직 마운트되지 않았다면 껍데기(Skeleton) 혹은 null 반환
  if (!mounted) {
    return <div className="mb-6 min-h-[100px]" />; // 레이아웃 시프트를 방지하기 위해 최소 높이 설정
  }

  return (
    <section>
      <h2 className="text-xl font-bold mb-4 flex items-center">상세 설명</h2>
      {detailImg ? (
        <div className="relative w-full h-full overflow-hidden bg-gray-100">
          <div className="flex flex-col items-center justify-center w-full h-full bg-gray-200 text-gray-400">
            <img
              src={detailImg.url}
              alt={detailImg.type}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      ) : (
        /* 높이(h-80)와 배경색(bg-gray-100) 추가 */
        <div className="w-full h-[200px] flex items-center justify-center text-gray-400 bg-gray-100 rounded-sm">
          <MdImage size={100} />
        </div>
      )}
    </section>
  );
}
