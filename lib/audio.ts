// lib/store/audio.ts
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type AudioState = {
  micMuted: boolean;
  deafened: boolean;
  inputDeviceId: string | null;
  outputDeviceId: string | null;
  videoDeviceId: string | null;
  inputVolume: number;
  outputVolume: number;
  toggleMicMuted: () => void;
  toggleDeafened: () => void;
  setDevices: (opts: {
    input: string | null;
    output: string | null;
    video: string | null;
  }) => void;
  setVolumes: (opts: { input: number; output: number }) => void;
};

export const useAudioStore = create<AudioState>()(
  persist(
    (set) => ({
      micMuted: false,
      deafened: false,
      inputDeviceId: null,
      outputDeviceId: null,
      videoDeviceId: null,
      inputVolume: 80,
      outputVolume: 80,

      toggleMicMuted: () =>
        set((s) => ({ micMuted: !s.micMuted })),

      toggleDeafened: () =>
        set((s) => ({ deafened: !s.deafened })),

      setDevices: ({ input, output, video }) =>
        set(() => ({
          inputDeviceId: input,
          outputDeviceId: output,
          videoDeviceId: video,
        })),

      setVolumes: ({ input, output }) =>
        set(() => ({
          inputVolume: input,
          outputVolume: output,
        })),
    }),
    {
      name: "worksphere-audio-settings",
    }
  )
);
