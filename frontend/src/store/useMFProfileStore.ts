import { create } from "zustand";
import { persist } from "zustand/middleware";

interface MFProfile {
  age: number;
  horizon: string;
  riskAppetite: "Conservative" | "Balanced" | "Aggresive";
  investmentGoal: string;
  isComplete: boolean;
}

interface MFProfileStore {
  profile: MFProfile;
  setProfile: (profile: MFProfile) => void;
  clearProfile: () => void;
}

const DEFAULT_PROFILE: MFProfile = {
  age: 25,
  horizon: "5-10 Years",
  riskAppetite: "Balanced",
  investmentGoal: "Wealth Creation",
  isComplete: false,
};

export const useMFProfileStore = create<MFProfileStore>()(
  persist(
    (set) => ({
      profile: DEFAULT_PROFILE,
      setProfile: (profile) => set({ profile: { ...profile, isComplete: true } }),
      clearProfile: () => set({ profile: DEFAULT_PROFILE }),
    }),
    {
      name: "mf-user-profile",
    }
  )
);
