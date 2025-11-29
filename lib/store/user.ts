// lib/store/user.ts
"use client";

import { create } from "zustand";
import type { IUser } from "@/lib/types/user";

type UserState = {
  user: IUser | null;
  isLoaded: boolean;
  setUser: (user: IUser | null) => void;
  setLoaded: (loaded: boolean) => void;
  clearUser: () => void;
};

export const useUserStore = create<UserState>((set) => ({
  user: null,
  isLoaded: false,

  setUser: (user) => set({ user }),
  setLoaded: (loaded) => set({ isLoaded: loaded }),

  clearUser: () => set({ user: null, isLoaded: false }),
}));
