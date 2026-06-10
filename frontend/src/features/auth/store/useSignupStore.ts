import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface TermAgreement {
  termVersionId: number;
  agreed: boolean;
}

interface SignupState {
  email: string;
  password: string;
  phoneNumber: string;
  termAgreements: TermAgreement[];
  setSignupData: (email: string, password: string, phoneNumber: string) => void;
  setTermAgreements: (termAgreements: TermAgreement[]) => void;
  resetSignupData: () => void;
}

export const useSignupStore = create<SignupState>()(
  persist(
    (set) => ({
      email: '',
      password: '',
      phoneNumber: '',
      termAgreements: [],

      // 이제 일반 string 타입의 인자를 받을 수 있습니다.
      setSignupData: (email, password, phoneNumber) =>
        set({ email, password, phoneNumber }),

      setTermAgreements: (termAgreements) => set({ termAgreements }),

      resetSignupData: () =>
        set({ email: '', password: '', phoneNumber: '', termAgreements: [] }),
    }),
    {
      name: 'signup-storage',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
