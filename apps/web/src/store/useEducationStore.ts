import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Progressive Education Store ─────────────────────────────────────────────
// Tracks which contextual education cards the user has dismissed.
// Cards only appear once — before the user's first interaction with that feature.

interface EducationState {
  hasSeenDepositEducation: boolean;
  hasSeenMachineEducation: boolean;
  hasSeenWithdrawalEducation: boolean;
  hasSeenReferralEducation: boolean;

  dismissEducation: (key: EducationKey) => void;
  shouldShowEducation: (key: EducationKey) => boolean;
}

export type EducationKey =
  | 'deposit'
  | 'machine'
  | 'withdrawal'
  | 'referral';

const KEY_MAP: Record<EducationKey, keyof Pick<EducationState, 'hasSeenDepositEducation' | 'hasSeenMachineEducation' | 'hasSeenWithdrawalEducation' | 'hasSeenReferralEducation'>> = {
  deposit: 'hasSeenDepositEducation',
  machine: 'hasSeenMachineEducation',
  withdrawal: 'hasSeenWithdrawalEducation',
  referral: 'hasSeenReferralEducation',
};

export const useEducationStore = create<EducationState>()(
  persist(
    (set, get) => ({
      hasSeenDepositEducation: false,
      hasSeenMachineEducation: false,
      hasSeenWithdrawalEducation: false,
      hasSeenReferralEducation: false,

      dismissEducation: (key: EducationKey) => {
        const field = KEY_MAP[key];
        if (field) {
          set({ [field]: true } as any);
        }
      },

      shouldShowEducation: (key: EducationKey): boolean => {
        const field = KEY_MAP[key];
        return field ? !get()[field] : false;
      },
    }),
    {
      name: 'education-storage',
      partialize: (state) => ({
        hasSeenDepositEducation: state.hasSeenDepositEducation,
        hasSeenMachineEducation: state.hasSeenMachineEducation,
        hasSeenWithdrawalEducation: state.hasSeenWithdrawalEducation,
        hasSeenReferralEducation: state.hasSeenReferralEducation,
      }),
    }
  )
);
