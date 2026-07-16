'use client';

import { useEventStore } from '@/features/event/store/useEventStore';
import { useEffect, useState } from 'react';

export function EventParticipationInfo() {
  // 하이드레이션 오류 방지를 위한 마운트 상태 관리
  const [mounted, setMounted] = useState(false);
  const { eventDetails } = useEventStore();

  const courses = eventDetails?.courses ?? [];

  // 컴포넌트가 마운트된 후에만 렌더링을 허용
  useEffect(() => {
    setMounted(true);
  }, []);

  // 아직 마운트되지 않았다면 껍데기(Skeleton) 혹은 null 반환
  if (!mounted) {
    return <div className="mb-6 min-h-[100px]" />; // 레이아웃 시프트를 방지하기 위해 최소 높이 설정
  }

  return (
    <section>
      <h2 className="text-base font-bold mb-2 flex items-center">
        참가/구성 정보
      </h2>
      <div className="border-t border-l border-r border-gray-300">
        {/* 참가비 안내 */}
        <div className="grid grid-cols-6 border-b border-gray-300 text-sm">
          <div className="bg-gray-100 p-4 text-gray-600 font-medium border-r border-gray-300 flex items-center">
            참가비 안내
          </div>
          <div className="col-span-3 p-4 text-gray-600">
            <div className="space-y-1">
              {courses.map((course) => (
                <p key={course.id}>
                  {course.name}
                  {course.distanceMeter > 10000 && (
                    <span>({(course.distanceMeter / 1000).toFixed(3)}km)</span>
                  )}
                  <span className="ml-1 ">
                    {course.price.toLocaleString()}원
                  </span>
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* 참가 인원 */}
        <div className="grid grid-cols-6 border-b border-gray-300 text-sm">
          <div className="bg-gray-100 p-4 text-gray-600 font-medium border-r border-gray-300 flex items-center">
            참가 인원
          </div>
          <div className="col-span-3 p-4 text-gray-600">
            <div className="space-y-1">
              {courses.map((course) => (
                <p key={course.id} className="text-gray-500">
                  {course.name}
                  {course.distanceMeter > 10000 && (
                    <span>({(course.distanceMeter / 1000).toFixed(3)}km)</span>
                  )}
                  <span className="ml-1 ">
                    {course.courseCapacity.toLocaleString()}명
                  </span>
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* 패키지 옵션 */}
        <div className="grid grid-cols-6 border-b border-gray-300 text-sm">
          <div className="bg-gray-100 p-4 text-gray-600 font-medium border-r border-gray-300 flex items-center">
            패키지 옵션
          </div>
          <div className="col-span-3 p-4 text-gray-600">
            <p>옵션별 상이 / 상세페이지 참고</p>
          </div>
        </div>
      </div>
    </section>
  );
}
