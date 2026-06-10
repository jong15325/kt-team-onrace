'use client';

import { useState, useEffect } from 'react'; // useEffect 추가
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import DistanceSlider from './filter/DistanceSlider';
import { IoLocationOutline } from 'react-icons/io5';
import { Input } from '@/components/ui/input';
import SingleDateRangePicker from './filter/SingleDateRangePicker';
import { REGION } from '@/types/constants';

export function EventFilter({
  setSearchDistance,
  setSearchDate,
  setSearchLocation,
  setSearchTerm,
}: {
  setSearchDistance: React.Dispatch<
    React.SetStateAction<{ min: number; max: number }>
  >;
  setSearchDate: (range: {
    start: Date | string | null;
    end: Date | string | null;
  }) => void;
  setSearchLocation: React.Dispatch<React.SetStateAction<string>>;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
}) {
  // 하이드레이션 오류 방지를 위한 마운트 상태 관리
  const [mounted, setMounted] = useState(false);

  const [keyword, setKeyword] = useState<string>('');
  const [location, setLocation] = useState<string>('ALL');
  const [range, setRange] = useState({ min: 0, max: 42.195 });
  const [dateRange, setDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({
    start: null,
    end: null,
  });

  // 컴포넌트가 마운트된 후에만 렌더링을 허용
  useEffect(() => {
    setMounted(true);
  }, []);

  // 백엔드 EventRegion enum 값을 사용 (label은 한글)
  const options = REGION.map((r) => ({ value: r.id, label: r.label }));

  const applyFilter = () => {
    setSearchDistance(range);
    setSearchDate(dateRange);
    setSearchLocation(location);
    setSearchTerm(keyword);
  };
  const initFilter = () => {
    setKeyword('');
    setLocation('ALL');
    setRange({ min: 0, max: 42.195 });
    setDateRange({ start: null, end: null });
  };

  // 아직 마운트되지 않았다면 껍데기(Skeleton) 혹은 null 반환
  if (!mounted) {
    return <div className="mb-6 min-h-[100px]" />; // 레이아웃 시프트를 방지하기 위해 최소 높이 설정
  }

  return (
    <div className="p-6  bg-secondary rounded-sm">
      <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-4 mb-6 items-center">
        {/* 거리 슬라이더 */}
        <div className="flex flex-col gap-2">
          <DistanceSlider onChange={(val: any) => setRange(val)} />
        </div>

        {/* 날짜 */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold">개최일</label>
          <SingleDateRangePicker onChange={(val) => setDateRange(val)} />
        </div>

        {/* 지역 */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold">개최지</label>
          <Select value={location} onValueChange={(val) => setLocation(val)}>
            <SelectTrigger
              variant="default"
              className="justify-between bg-white"
            >
              <div className="flex items-center text-left">
                <IoLocationOutline className="mr-2" />
                <SelectValue placeholder="지역을 선택하세요" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 초기화 버튼 */}
        <div className="self-end">
          <Button variant="outline" rounded="full" onClick={initFilter}>
            필터 초기화
          </Button>
        </div>

        {/* 키워드 및 검색 (전체 너비 사용 및 버튼 인라인 배치) */}
        <div className="col-span-3 space-y-2">
          <label className="text-sm font-bold">키워드</label>
          <div className="flex gap-2">
            <Input
              className="flex-1"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="검색어를 입력하세요"
            />
          </div>
        </div>
        <div className="self-end">
          <Button variant="primary1" rounded="full" onClick={applyFilter}>
            검색하기
          </Button>
        </div>
      </div>
    </div>
  );
}
