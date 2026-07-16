'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

import {
  AgreeConfirmModal,
  UserConfirmModal,
} from '@/features/ticketing/components/details/entry';
import { useDetailedTracker } from '@/features/ticketing/hooks/useDetailedTracker';
import { Input } from '@/components/ui/input';

export default function MarathonDetailPage() {
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isAgreeModalOpen, setIsAgreeModalOpen] = useState(false);

  const [minDistance, setMinDistance] = useState(10);

  const { isRecording, logs, startTracking, stopTracking, getFinalData } =
    useDetailedTracker();

  const handleStart = () => {
    setIsUserModalOpen(true);

    startTracking(minDistance);
  };
  const handleStop = () => {
    setIsUserModalOpen(false);
    setIsAgreeModalOpen(false);
    stopTracking();
  };

  const handleStopAndDownload = () => {
    setIsUserModalOpen(false);
    setIsAgreeModalOpen(false);
    stopTracking();
    handleDownload();
  };

  const handleDownload = () => {
    // getFinalData를 호출하여 최근 60초치 데이터만 가져옵니다.
    // 이 함수는 ref(logBuffer)를 직접 참조하므로 상태(logs)보다 최신 데이터를 보장합니다.
    const dataToDownload = getFinalData();

    // 데이터가 없을 경우 처리
    if (dataToDownload.length === 0) {
      alert('다운로드할 데이터가 없습니다. (최근 60초 이내 기록 없음)');
      return;
    }

    // JSON 변환
    const jsonString = JSON.stringify(dataToDownload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    // 다운로드 링크 생성 및 실행
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    // 파일명에 현재 시간을 포함 (ISO 형식 등을 사용하면 더 읽기 좋습니다)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.download = `mouse_data_last_60s_${timestamp}.json`;

    document.body.appendChild(link);
    link.click();

    // 정리 (Cleanup)
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadBinary = () => {
    const currentLogs = isRecording ? [...logs] : logs;
    if (currentLogs.length === 0) return;

    /**
     * [바이너리 구조 설계]
     * 1개 로그당 바이트 계산:
     * - x: 4 bytes (Int32)
     * - y: 4 bytes (Int32)
     * - timestamp: 8 bytes (Float64 - 밀리초 단위 정밀도 유지)
     * - eventType: 1 byte (Uint8 - 0: move, 1: down, 2: up)
     * 총 합계: 17 bytes per log
     */
    const RECORD_SIZE = 17;
    const buffer = new ArrayBuffer(currentLogs.length * RECORD_SIZE);
    const view = new DataView(buffer);

    // 이벤트 타입 매핑
    const typeMap: Record<string, number> = {
      pointermove: 0,
      pointerdown: 1,
      pointerup: 2,
    };

    currentLogs.forEach((log, index) => {
      const offset = index * RECORD_SIZE;

      view.setInt32(offset, Math.floor(log.x), true); // x 저장
      view.setInt32(offset + 4, Math.floor(log.y), true); // y 저장
      view.setFloat64(offset + 8, log.timestamp, true); // timestamp 저장
      view.setUint8(offset + 16, typeMap[log.eventType] ?? 255); // eventType 저장
    });

    // Blob 생성 (application/octet-stream은 일반적인 이진 파일 형식)
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `mouse_data_${new Date().getTime()}.bin`; // 확장자를 .bin으로 변경
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const userData = {
    name: '김유저',
    birthDate: '1995.01.15',
    gender: '남성',
    phone: '010-1234-5678',
    email: 'hong @example.com',
  };

  const eventData = {
    name: '부산 바다 러닝 페스티벌',
    eventDate: '2026.04.16 (목) 오전 9:00',
    location: '부산',
  };

  const optionData = {
    course: '10km',
    pace: '6\'30\"\/km',
  };

  return (
    <div className="max-w-6xl mx-auto min-h-screen py-10">
      <div className="flex items-center justify-bewteen">
        <div className="flex-1 text-2xl mb-4 text-bold">
          마우스 데이터 모니터링
        </div>
        <div className="flex text-2xl mb-4 text-bold gap-2 items-center">
          <p className="text-sm">MIN_DISTANCE(px)</p>
          <Input
            value={minDistance}
            onChange={(e) => setMinDistance(Number(e.target.value))}
          />

          <Button
            variant="outline"
            size="fit"
            rounded="lg"
            onClick={handleStart}
          >
            수집
          </Button>

          {/* <Button
            variant="outline"
            size="fit"
            rounded="lg"
            onClick={handleDownload}
            disabled={logs.length === 0}
          >
            JSON 다운로드
          </Button>
          <Button
            variant="outline"
            size="fit"
            rounded="lg"
            onClick={handleDownloadBinary}
            disabled={logs.length === 0}
          >
            바이너리 다운로드
          </Button> */}
        </div>

        <div>
          <UserConfirmModal
            isOpen={isUserModalOpen}
            onClose={handleStop}
            onConfirm={() => {
              setIsUserModalOpen(false);
              setIsAgreeModalOpen(true);
            }}
            data={userData}
          />
          <AgreeConfirmModal
            isOpen={isAgreeModalOpen}
            onClose={handleStop}
            onConfirm={handleStopAndDownload}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 요약 카드 */}
        <div className="lg:col-span-1 space-y-4">
          <SummaryCard title="총 데이터 포인트" value={logs.length} unit="개" />
        </div>

        {/* 상세 로그 테이블 */}
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
            <span className="font-bold text-slate-700">
              이벤트 타입별 상세 로그
            </span>
            <span className="text-xs text-slate-400 font-mono italic">
              Newest first
            </span>
          </div>
          <div className="overflow-y-auto max-h-[600px]">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase sticky top-0 border-b">
                <tr>
                  <th className="p-4">Time</th>
                  <th className="p-4">Position x</th>
                  <th className="p-4">Position y</th>
                  <th className="p-4">Event</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs
                  .slice()
                  .reverse()
                  .slice(0, 50)
                  .map((log, i) => (
                    <tr
                      key={i}
                      className="hover:bg-indigo-50/30 transition-colors"
                    >
                      <td className="p-4 font-mono text-[11px] text-slate-400">
                        {(log.timestamp % 100000).toFixed(0)}
                      </td>
                      <td className="p-4 font-bold text-slate-700 text-sm">
                        {log.x}
                      </td>
                      <td className="p-4 font-bold text-slate-700 text-sm">
                        {log.y}
                      </td>

                      {/* 타입별 카운팅 표시 */}
                      <td className="p-4 text-xs">
                        <span
                          className={`px-2 py-0.5 rounded-full font-medium ${getEventBadgeColor(log.eventType)}`}
                        >
                          {log.eventType || 'none'}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, unit, color = 'text-slate-800' }: any) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
      <div className="text-[11px] font-bold text-slate-400 uppercase mb-1">
        {title}
      </div>
      <div className={`text-2xl font-black ${color}`}>
        {value}
        <span className="text-sm font-normal text-slate-400">{unit}</span>
      </div>
    </div>
  );
}

function getEventBadgeColor(type: string) {
  switch (type) {
    case 'pointermove':
      return 'bg-blue-50 text-blue-600';
    case 'pointerdown':
      return 'bg-rose-50 text-rose-600 font-bold underline';
    case 'pointerup':
      return 'bg-amber-50 text-amber-600 font-bold underline';
    default:
      return 'bg-slate-50 text-slate-400';
  }
}
