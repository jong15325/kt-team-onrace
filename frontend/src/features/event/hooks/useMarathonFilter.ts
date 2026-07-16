import { useState, useMemo } from 'react';
import { EventSearchQuery } from '@/features/event/types';

/**
 * 이벤트 목록 필터 상태를 보관하고, 백엔드 EventSearchRequest 와 정합되는
 * query 객체(EventSearchQuery)를 만들어 준다. (서버사이드 필터링)
 * 거리(km)는 미터로, 날짜는 yyyy-MM-dd(LocalDate)로 변환한다.
 */
export function useMarathonFilter(
  initialSearchDistance = { min: 0, max: 42.195 },
  initialSearchDate = {
    start: null as string | null,
    end: null as string | null,
  },
  initialSearchLocation = 'ALL',
  initialSearchTerm = '',
  initialSearchType = 'ALL',
) {
  const [searchDistance, setSearchDistance] = useState(initialSearchDistance);
  const [searchDate, setSearchDate] = useState(initialSearchDate);
  const [searchLocation, setSearchLocation] = useState(initialSearchLocation);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [searchType, setSearchType] = useState(initialSearchType);

  // Date | string | null → yyyy-MM-dd (LocalDate)
  const toLocalDate = (date: Date | string | null): string | null => {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const handleSetSearchDate = (range: {
    start: Date | string | null;
    end: Date | string | null;
  }) => {
    setSearchDate({
      start: toLocalDate(range.start),
      end: toLocalDate(range.end),
    });
  };

  // 백엔드 EventSearchRequest 와 정합되는 쿼리 객체
  const query: EventSearchQuery = useMemo(() => {
    const q: EventSearchQuery = {};
    if (searchType && searchType !== 'ALL') q.type = searchType;
    if (searchLocation && searchLocation !== 'ALL') q.region = searchLocation;
    if (searchTerm && searchTerm.trim()) q.keyword = searchTerm.trim();
    if (searchDate.start) q.eventStartDate = searchDate.start;
    if (searchDate.end) q.eventEndDate = searchDate.end;
    if (searchDistance) {
      const min = Math.round(searchDistance.min * 1000);
      const max = Math.round(searchDistance.max * 1000);
      if (min > 0) q.minDistance = min;
      if (max < 42195) q.maxDistance = max;
    }
    return q;
  }, [searchType, searchLocation, searchTerm, searchDate, searchDistance]);

  return {
    searchLocation,
    searchTerm,
    searchDistance,
    searchDate,
    searchType,
    setSearchLocation,
    setSearchTerm,
    setSearchDistance,
    setSearchDate: handleSetSearchDate,
    setSearchType,
    query,
  };
}
