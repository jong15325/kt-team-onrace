'use client';

import { Button } from '@/components/ui/button';
import { useEventStore } from '@/features/event/store/useEventStore';
import { useEffect, useState } from 'react';
import { MdChevronLeft, MdChevronRight, MdImage } from 'react-icons/md';

export function EventThumbnail() {
  // 하이드레이션 오류 방지를 위한 마운트 상태 관리
  const [mounted, setMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { eventDetails } = useEventStore();

  const thumbnailImg = eventDetails?.thumbnailImg ?? [];
  const images = thumbnailImg?.map((item) => item.url) ?? [];
  const hasMultipleImages = images.length > 1;

  const handlePrev = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // 부모 클릭 이벤트 방지
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // 부모 클릭 이벤트 방지
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  // 컴포넌트가 마운트된 후에만 렌더링을 허용
  useEffect(() => {
    setMounted(true);
  }, []);

  // 아직 마운트되지 않았다면 껍데기(Skeleton) 혹은 null 반환
  if (!mounted) {
    return <div className="mb-6 min-h-[100px]" />; // 레이아웃 시프트를 방지하기 위해 최소 높이 설정
  }

  return (
    <div className="grid grid-cols-1 gap-10">
      <div className="relative w-full aspect-square overflow-hidden bg-gray-200 group rounded-lg">
        {images.length > 0 ? (
          <>
            {/* 이미지 슬라이더 컨테이너 */}
            <div
              className="flex transition-transform duration-500 ease-out h-full"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {images.map((img: string, index: number) => (
                <img
                  key={index}
                  src={img}
                  alt={`thumbnailImg-${index}`}
                  className="w-full h-full object-cover flex-shrink-0"
                />
              ))}
            </div>

            {/* 좌우 이동 버튼 (호버 시에만 표시) */}
            {hasMultipleImages && (
              <>
                <Button
                  variant="text"
                  size="icon"
                  onClick={handlePrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-white/50 hover:text-black text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                  <MdChevronLeft size={30} />
                </Button>
                <Button
                  variant="text"
                  size="icon"
                  onClick={handleNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-white/50 hover:text-black text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                  <MdChevronRight size={30} />
                </Button>
              </>
            )}

            {/* 하단 점 표시 (인덱스 표시기) */}
            {hasMultipleImages && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {images.map((_: string, index: number) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentIndex(index);
                    }}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      currentIndex === index
                        ? 'bg-white scale-125'
                        : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          /* 이미지가 없을 때 */
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <MdImage size={100} />
          </div>
        )}
      </div>
    </div>
  );
}
