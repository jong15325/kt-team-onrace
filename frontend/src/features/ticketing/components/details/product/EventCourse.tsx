'use client';

import { Button } from '@/components/ui/button';
import { useEventStore } from '@/features/event/store/useEventStore';
import { useEffect, useState } from 'react';
import {
  LuDroplet,
  LuFlag,
  LuMountain,
  LuRoute,
  LuArrowLeft,
  LuArrowRight,
} from 'react-icons/lu';
import { MdAccessTime, MdImage } from 'react-icons/md';

export function EventCourse() {
  const [mounted, setMounted] = useState(false);
  // 현재 선택된 코스의 인덱스 상태 추가
  const [isError, setIsError] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const { eventDetails } = useEventStore();
  const courses = eventDetails?.courses ?? [];

  const currentCourse = courses?.[currentIndex];

  useEffect(() => {
    setMounted(true);
  }, []);

  // 코스가 변경(currentIndex 변경)될 때마다 에러 상태를 초기화해야 합니다.
  useEffect(() => {
    setIsError(false);
  }, [currentIndex, currentCourse.mapImg]);

  if (!mounted) {
    return <div className="mb-6 min-h-[100px]" />;
  }

  // 코스가 없을 경우 예외 처리
  if (!courses || courses.length === 0) return null;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? courses.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === courses.length - 1 ? 0 : prev + 1));
  };

  function formatTime(totalMinutes: number) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}시간 ${minutes}분`;
  }

  return (
    <section>
      <div>
        {/* 헤더 영역: 코스 안내 타이틀과 화살표 버튼 */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold flex items-center">코스 안내</h2>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          {/* 좌측: 이미지 영역 */}
          <div className="w-full md:w-3/5 h-[300px] overflow-hidden bg-gray-100 rounded-sm">
            {!currentCourse.mapImg || isError ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                <MdImage size={100} />
                <p className="mt-2 text-sm">이미지를 불러올 수 없습니다.</p>
              </div>
            ) : (
              <img
                src={currentCourse.mapImg}
                alt={`${currentIndex + 1}번 코스 안내도`}
                className="w-full h-full object-fill"
                onError={() => setIsError(true)} // 에러 발생 시 상태 변경
              />
            )}
          </div>

          {/* 우측: 2x2 카드 그리드 영역 */}
          <div className="w-full md:w-2/5 grid grid-cols-2 grid-rows-[auto_auto_1fr] gap-2 h-[300px]">
            {/* 카드 1 */}
            <div className="bg-gray-800 p-3 flex flex-col rounded-sm">
              <span className="text-font-accent text-sm inline-flex items-center gap-1">
                <LuFlag />총 거리
              </span>
              <span className="text-white">
                {currentCourse.distanceMeter > 10000
                  ? (currentCourse.distanceMeter / 1000).toFixed(3)
                  : currentCourse.distanceMeter / 1000}
                km
              </span>
            </div>

            {/* 카드 2 */}
            <div className="bg-gray-800 p-3 flex flex-col rounded-sm">
              <span className="text-font-accent text-sm inline-flex items-center gap-1">
                <MdAccessTime />
                제한 시간
              </span>
              <span className="text-white">
                {formatTime(currentCourse.timeLimit)}
              </span>
            </div>

            {/* 카드 3 */}
            <div className="bg-gray-800 p-3 flex flex-col rounded-sm">
              <span className="text-font-accent text-sm inline-flex items-center gap-1">
                <LuDroplet />
                급수처
              </span>
              <span className="text-white">
                총 {currentCourse.waterSource}곳
              </span>
            </div>

            {/* 카드 4 */}
            <div className="bg-gray-800 p-3 flex flex-col rounded-sm">
              <span className="text-font-accent text-sm inline-flex items-center gap-1">
                <LuMountain />
                고도 변화
              </span>
              <span className="text-white">
                ±{currentCourse.altitude.toLocaleString('ko-KR')}m
              </span>
            </div>

            {/* 카드 5 */}
            <div className="bg-gray-800 p-3 flex flex-col rounded-sm col-span-2 overflow-y-auto">
              <span className="text-font-accent text-sm inline-flex items-center gap-1">
                <LuRoute />
                상세 코스
              </span>
              <span className="text-white text-sm leading-relaxed">
                {currentCourse.courseRoute}
              </span>
            </div>
          </div>
        </div>
        {courses.length > 1 && (
          <div className="flex items-center py-2">
            <div className="flex gap-2">
              <Button variant="ghost" onClick={handlePrev}>
                <LuArrowLeft size={20} />
              </Button>
              <Button variant="ghost" onClick={handleNext}>
                <LuArrowRight size={20} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
