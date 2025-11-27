// lib/store/user.ts
"use client";

import { create } from "zustand";

type User = {
  id: string;
  email: string;
  name?: string;
};

type State = {
  user: User | null;
  setUser: (user: User | null) => void;
};

export const useUserStore = create<State>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
