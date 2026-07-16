'use client';

import { useEffect, useState } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEventStore } from '@/features/event/store/useEventStore';

export function EntryOptions() {
  const {
    eventDetails,
    courseId,
    paceId,
    setCourse,
    setPace,
    setCourseId,
    setPaceId,
  } = useEventStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="mb-6 min-h-[100px]" />;
  }

  // 실제 이벤트 코스/페이스 (getEventDetails 로 이미 적재됨)
  const courses = eventDetails?.courses ?? [];
  const selectedCourse = courses.find((c) => c.id === courseId);
  const paces = selectedCourse?.paces ?? [];

  const handleCourseChange = (val: string) => {
    const id = Number(val);
    const c = courses.find((co) => co.id === id);
    setCourseId(id);
    setCourse(c?.name ?? '');
    // 코스 변경 시 페이스 초기화
    setPaceId(null);
    setPace('');
  };

  const handlePaceChange = (val: string) => {
    const id = Number(val);
    const p = paces.find((pa) => pa.id === id);
    setPaceId(id);
    setPace(
      p ? `${p.name} (${p.hour}:${String(p.minutes).padStart(2, '0')})` : '',
    );
  };

  return (
    <section>
      {/* 코스 선택 */}
      <div className="p-2">
        <label className="text-base font-semibold">코스*</label>
        <Select
          value={courseId != null ? String(courseId) : undefined}
          onValueChange={handleCourseChange}
        >
          <SelectTrigger variant="default">
            <SelectValue placeholder="코스를 선택하세요" />
          </SelectTrigger>
          <SelectContent>
            {courses.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 페이스 선택 */}
      <div className="p-2">
        <label className="text-base font-semibold">페이스*</label>
        <Select
          value={paceId != null ? String(paceId) : undefined}
          onValueChange={handlePaceChange}
          disabled={courseId == null}
        >
          <SelectTrigger variant="default">
            <SelectValue
              placeholder={
                courseId == null ? '코스를 먼저 선택하세요' : '페이스를 선택하세요'
              }
            />
          </SelectTrigger>
          <SelectContent>
            {paces.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.name} ({p.hour}:{String(p.minutes).padStart(2, '0')})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </section>
  );
}
