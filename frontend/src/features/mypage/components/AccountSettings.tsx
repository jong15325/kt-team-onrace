'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { LuCircleAlert, LuClock } from 'react-icons/lu';

import AddressForm from './AddressForm';
import { myPageService } from '../services';
import { AccountInfo, Address } from '../types/accountInfo';
import { authService } from '@/features/auth/services';
import { addressService } from '@/features/address/services';
import { cn } from '@/lib/utils';

export function AccountSettings() {
  const router = useRouter();
  // 하이드레이션 오류 방지를 위한 마운트 상태 관리
  const [mounted, setMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPassModalOpen, setPassIsModalOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<AccountInfo>();

  // 비밀번호 변경 모달
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwOk, setPwOk] = useState<boolean | null>(null);
  // 재설정 링크 유효시간 카운트다운 (초). null이면 미표시
  const [linkRemainSec, setLinkRemainSec] = useState<number | null>(null);

  // 1초마다 카운트다운
  useEffect(() => {
    if (linkRemainSec === null || linkRemainSec <= 0) return;
    const t = setTimeout(() => setLinkRemainSec((s) => (s ?? 0) - 1), 1000);
    return () => clearTimeout(t);
  }, [linkRemainSec]);

  const formatMmss = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const closePwModal = () => {
    setPwModalOpen(false);
    setCurrentPassword('');
    setPwMsg('');
    setPwOk(null);
    setLinkRemainSec(null);
  };

  // 비밀번호 변경 요청: 현재 비번 확인 후 재설정 링크 메일 발송
  const submitChangePassword = async () => {
    if (!currentPassword) {
      setPwOk(false);
      setPwMsg('현재 비밀번호를 입력해주세요.');
      return;
    }
    try {
      const res = await authService.changePassword({ currentPassword });
      if (res.success) {
        setPwOk(true);
        setPwMsg('비밀번호 재설정 링크를 이메일로 보냈습니다. 메일함을 확인해 주세요.');
        setCurrentPassword('');
        setLinkRemainSec(15 * 60); // 15분 카운트다운 시작
      } else {
        setPwOk(false);
        setPwMsg(res.message ?? '요청에 실패했습니다.');
      }
    } catch (error: any) {
      setPwOk(false);
      setPwMsg(
        error?.response?.data?.message ??
          '에러가 발생했습니다, 다시 시도해주세요',
      );
    }
  };

  // 본인인증 재인증 (SMS/Solapi) - 이름 + 휴대폰 + 인증번호
  const [rvName, setRvName] = useState('');
  const [rvPhone, setRvPhone] = useState('');
  const [rvCode, setRvCode] = useState('');
  const [rvMsg, setRvMsg] = useState('');
  const [rvOk, setRvOk] = useState<boolean | null>(null);

  const resetReverify = () => {
    setRvName('');
    setRvPhone('');
    setRvCode('');
    setRvMsg('');
    setRvOk(null);
  };

  // 인증번호 발송 (가입된 번호에만 발송 / 균일 응답)
  const handleSendReverifyCode = async () => {
    const phone = rvPhone.replace(/\D/g, '');
    if (!phone) {
      setRvOk(false);
      setRvMsg('휴대폰 번호를 입력해주세요.');
      return;
    }
    try {
      await authService.sendSmsCodeForFind({ phoneNumber: phone });
      setRvOk(true);
      setRvMsg('인증번호를 발송했습니다. (3분 이내 입력)');
    } catch (error: any) {
      setRvOk(false);
      // 횟수 초과 등 백엔드 비즈니스 메시지를 그대로 노출
      setRvMsg(
        error?.response?.data?.message ??
          '에러가 발생했습니다, 다시 시도해주세요',
      );
    }
  };

  // SMS 인증 후 본인인증 완료 처리
  const handleCompleteReverify = async () => {
    const phone = rvPhone.replace(/\D/g, '');
    if (!rvName || !phone || !rvCode) {
      setRvOk(false);
      setRvMsg('이름, 휴대폰, 인증번호를 모두 입력해주세요.');
      return;
    }
    try {
      const verify = await authService.verifySmsCode({
        phoneNumber: phone,
        code: rvCode,
      });
      if (!verify.success) {
        setRvOk(false);
        setRvMsg('인증번호가 올바르지 않거나 만료되었습니다.');
        return;
      }
      const res = await authService.completePassVerification({
        name: rvName,
      });
      if (res.success) {
        alert('본인인증이 완료되었습니다.');
        setUserInfo((prev) => (prev ? { ...prev, name: rvName } : prev));
        setPassIsModalOpen(false);
        resetReverify();
      } else {
        setRvOk(false);
        setRvMsg(res.message ?? '본인인증에 실패했습니다.');
      }
    } catch (error: any) {
      setRvOk(false);
      setRvMsg(
        error?.response?.data?.message ??
          '에러가 발생했습니다, 다시 시도해주세요',
      );
    }
  };

  const [marketingSettings, setMarketingSettings] = useState({
    email: true,
    sms: false,
    push: true,
  });

  const formatPhoneNumber = (phoneNumber: string) => {
    return phoneNumber
      .replace(/[^0-9]/g, '')
      .replace(/^(\d{2,3})(\d{3,4})(\d{4})$/, `$1-$2-$3`);
  };
  // 배송지 수정 대상 (null이면 신규 추가)
  const [editTarget, setEditTarget] = useState<Address | null>(null);
  const openNewAddress = () => {
    setEditTarget(null);
    setIsModalOpen(true);
  };
  const openEditAddress = (address: Address) => {
    setEditTarget(address);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setEditTarget(null);
  };

  const handleDeleteAddress = async (id: number) => {
    if (!window.confirm('이 배송지를 삭제하시겠습니까?')) return;
    try {
      const res = await addressService.deleteAddress(String(id));
      if (res.success) {
        fetchAccount();
      } else {
        alert(res.message ?? '삭제에 실패했습니다.');
      }
    } catch (error: any) {
      alert(
        error?.response?.data?.message ??
          '에러가 발생했습니다, 다시 시도해주세요',
      );
    }
  };

  const toggleSetting = (key: keyof typeof marketingSettings) => {
    setMarketingSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  // 컴포넌트가 마운트된 후에만 렌더링을 허용
  useEffect(() => {
    setMounted(true);
  }, []);

  // 같은 브라우저의 다른 탭에서 비밀번호 재설정이 완료되면
  // 이 탭(요청한 마이페이지)도 팝업을 닫고 로그아웃 → 로그인으로 이동
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    const bc = new BroadcastChannel('password-reset');
    bc.onmessage = async (e: MessageEvent) => {
      if (e.data?.type === 'done') {
        setPwModalOpen(false);
        await signOut({ redirect: false });
        router.push('/login');
      }
    };
    return () => bc.close();
  }, [router]);

  const fetchAccount = async () => {
    try {
      const response = await myPageService.getAccountInfo();
      setUserInfo((prev) => ({
        ...prev,
        ...response.data,
      }));
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    }
  };

  useEffect(() => {
    if (mounted) fetchAccount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // 아직 마운트되지 않았다면 껍데기(Skeleton) 혹은 null 반환
  if (!mounted) {
    return <div className="mb-6 min-h-[100px]" />; // 레이아웃 시프트를 방지하기 위해 최소 높이 설정
  }

  return (
    <div className="min-h-screen bg-white">
      {userInfo && (
        <div className="space-y-20">
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-black">회원 정보</h2>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex">
                <span className="w-30 text-base font-medium text-font-medium">
                  이름
                </span>
                <span className="flex-1 text-base font-medium">
                  {userInfo.name}
                </span>
              </div>
              <div className="flex">
                <span className="w-30 text-base font-medium text-font-medium">
                  휴대폰 번호
                </span>
                <span className="flex-1 text-base font-medium">
                  {formatPhoneNumber(userInfo.phoneNumber)}
                </span>
              </div>
              <div className="flex items-center">
                <span className="w-30 text-base font-medium text-font-medium">
                  이메일(ID)
                </span>
                <span className="flex-1 text-base font-medium flex items-center gap-2">
                  <div
                    className={cn(
                      'text-sm font-semibold px-2 py-0.5 rounded-sm bg-gray-100',
                    )}
                  >
                    기본이메일
                  </div>
                  <span className="whitespace-nowrap">{userInfo.email}</span>
                </span>
              </div>
              <div className="flex items-center">
                <span className="w-30 text-base font-medium text-font-medium">
                  비밀번호
                </span>
                <span className="flex text-base font-medium mr-4">******</span>
                <div>
                  <Button
                    variant="outline"
                    size="xs"
                    rounded="sm"
                    className="text-gray-500"
                    onClick={() => setPwModalOpen(true)}
                  >
                    변경하기
                  </Button>
                </div>
              </div>
              <div className="flex items-center">
                <span className="w-30 text-base font-medium text-font-medium">
                  본인인증 상태
                </span>
                <span className="flex text-base font-medium mr-4">
                  인증완료
                </span>
                <div>
                  <Button
                    variant="outline"
                    size="xs"
                    rounded="sm"
                    className="text-gray-500"
                    onClick={() => setPassIsModalOpen(true)}
                  >
                    다시 인증하기
                  </Button>
                </div>
              </div>

              {/* <div className="flex items-center justify-between p-4 bg-red-50 border border-red-100 text-font-error rounded-sm">
                <div className="flex items-center">
                  <LuCircleAlert size={24} className="mr-2" />
                  <span>
                    최초 1회의 본인인증 이후 모든 서비스 이용이 가능합니다.
                  </span>
                </div>
                <div className="flex">
                  <Button
                    variant="destructive"
                    rounded="full"
                    onClick={() => setPassIsModalOpen(true)}
                  >
                    인증하기
                  </Button>
                </div>
              </div> */}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-800">배송지 정보</h2>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {userInfo.addressList && userInfo.addressList.length > 0 ? (
                userInfo.addressList.map((address) => (
                  <div
                    key={address.id}
                    className={`relative p-2 transition-all`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-gray-900 text-lg">
                        {address.label}
                      </span>
                      {address.isDefault && (
                        <span className="px-2 py-0.5 text-[10px] font-bold text-font-medium bg-gray-100 rounded-sm">
                          기본 배송지
                        </span>
                      )}
                    </div>

                    <div className="mb-1">
                      <p className="text-gray-800 font-medium">
                        {address.address1}, {address.address2}
                      </p>
                    </div>

                    <div className="text-sm text-gray-500 flex items-center gap-1">
                      <span>{address.receiverName}</span>
                      <span>•</span>
                      <span>{formatPhoneNumber(address.phoneNumber)}</span>
                    </div>

                    <div className="absolute top-3 right-3 flex flex-col gap-1">
                      <div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditAddress(address)}
                        >
                          수정
                        </Button>
                      </div>
                      <div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteAddress(address.id)}
                        >
                          삭제
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center text-font-medium">
                  등록된 배송지가 없습니다
                </div>
              )}

              <div className="max-w-2xl mx-auto flex items-center justify-center">
                <Button
                  variant="outline"
                  rounded="full"
                  className="border-gray-300 text-gray-500"
                  onClick={openNewAddress}
                >
                  신규 배송지 추가
                </Button>
                {isModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                      <AddressForm
                        onClose={closeModal}
                        onSaved={fetchAccount}
                        editId={editTarget?.id}
                        initial={
                          editTarget
                            ? {
                                nickname: editTarget.label,
                                receiver: editTarget.receiverName,
                                contact: editTarget.phoneNumber,
                                zonecode: editTarget.zipcode,
                                address: editTarget.address1,
                                detailAddress: editTarget.address2,
                                isDefault: editTarget.isDefault,
                              }
                            : undefined
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-800">
                  마케팅 및 알림 설정
                </h2>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="p-4 bg-secondary border-1 border-gray-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-black">
                      <span className="text-gray-500 pr-1">[선택]</span>
                      마케팅 정보 수신 동의
                    </p>
                    <p className="text-sm text-gray-500">
                      동의하시면 이벤트 알람, 프로모션 메시지 등의 마케팅 정보를
                      받아보실 수 있습니다.
                    </p>
                  </div>
                  <Toggle
                    enabled={marketingSettings.email}
                    onToggle={() => toggleSetting('email')}
                  />
                </div>
              </div>
            </div>
          </section>
          {isPassModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
                <h3 className="text-2xl font-bold mb-2">본인인증 (SMS)</h3>
                <p className="text-sm text-font-medium mb-6">
                  휴대폰 문자 인증으로 본인 확인을 진행합니다.
                </p>

                <div className="space-y-3">
                  <Input
                    variant="primary"
                    label="이름"
                    placeholder="이름을 입력해주세요"
                    value={rvName}
                    onChange={(e) => setRvName(e.target.value)}
                  />
                  <Input
                    variant="primary"
                    label="휴대폰번호"
                    placeholder="010-1234-5678"
                    value={rvPhone}
                    onChange={(e) => setRvPhone(e.target.value)}
                    rightElement={
                      <Button
                        variant="primary1"
                        size="xs"
                        rounded="full"
                        className="text-xs"
                        onClick={handleSendReverifyCode}
                      >
                        인증번호 발송
                      </Button>
                    }
                  />
                  <Input
                    variant="primary"
                    label="인증번호"
                    placeholder="인증번호를 입력해주세요"
                    value={rvCode}
                    onChange={(e) => setRvCode(e.target.value)}
                  />
                </div>

                {rvMsg && (
                  <p
                    className={`text-xs mt-2 px-1 ${
                      rvOk ? 'text-green-600' : 'text-red-500'
                    }`}
                  >
                    {rvMsg}
                  </p>
                )}

                <div className="flex gap-2 mt-6">
                  <Button
                    variant="outline"
                    rounded="sm"
                    className="border-gray-200"
                    onClick={() => {
                      setPassIsModalOpen(false);
                      resetReverify();
                    }}
                  >
                    취소
                  </Button>
                  <Button
                    variant="primary1"
                    rounded="sm"
                    onClick={handleCompleteReverify}
                  >
                    인증 완료
                  </Button>
                </div>
              </div>
            </div>
          )}

          {pwModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
                <h3 className="text-2xl font-bold mb-2">비밀번호 변경</h3>
                <p className="text-sm text-font-medium mb-6">
                  현재 비밀번호 확인 후, 등록된 이메일로 재설정 링크를
                  보내드립니다.
                  <br />
                  <span className="text-font-low">
                    ※ 재설정 링크는 발송 후 15분간 유효합니다.
                  </span>
                </p>
                <div className="mb-6">
                  <Input
                    variant="primary"
                    type="password"
                    label="현재 비밀번호"
                    placeholder="현재 비밀번호를 입력해주세요"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                {pwMsg && (
                  <p
                    className={`text-xs mb-3 px-1 ${
                      pwOk ? 'text-green-600' : 'text-red-500'
                    }`}
                  >
                    {pwMsg}
                  </p>
                )}

                {linkRemainSec !== null && (
                  <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs text-font-medium mb-2 text-center">
                      재설정 링크 유효시간
                    </p>
                    {linkRemainSec > 0 ? (
                      <>
                        <div className="flex items-center justify-center gap-2">
                          <LuClock
                            size={22}
                            className={
                              linkRemainSec <= 60
                                ? 'text-red-500'
                                : 'text-black'
                            }
                          />
                          <span
                            className={`text-3xl font-bold tabular-nums tracking-wider ${
                              linkRemainSec <= 60
                                ? 'text-red-500'
                                : 'text-black'
                            }`}
                          >
                            {formatMmss(linkRemainSec)}
                          </span>
                        </div>
                        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                              linkRemainSec <= 60 ? 'bg-red-500' : 'bg-black'
                            }`}
                            style={{
                              width: `${(linkRemainSec / (15 * 60)) * 100}%`,
                            }}
                          />
                        </div>
                      </>
                    ) : (
                      <p className="text-center text-sm font-semibold text-red-500">
                        링크가 만료되었습니다. 다시 요청해 주세요.
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    rounded="sm"
                    className="border-gray-200"
                    onClick={closePwModal}
                  >
                    {pwOk ? '닫기' : '취소'}
                  </Button>
                  <Button
                    variant="primary1"
                    rounded="sm"
                    onClick={submitChangePassword}
                  >
                    재설정 링크 받기
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 토글 스위치 컴포넌트
const Toggle = ({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) => {
  return (
    <button
      onClick={onToggle}
      className={`${
        enabled ? 'bg-black' : 'bg-gray-200'
      } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none`}
    >
      <span
        className={`${
          enabled ? 'translate-x-6' : 'translate-x-1'
        } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
      />
    </button>
  );
};
