// lib/audio.ts
"use client";

import { create } from "zustand";

type Devices = {
  input: string | null;
  output: string | null;
  video: string | null;
};

type Volumes = {
  input: number;
  output: number;
};

type AudioState = {
  // Devices
  inputDeviceId: string | null;
  outputDeviceId: string | null;
  videoDeviceId: string | null;

  // Volumes
  inputVolume: number;
  outputVolume: number;

  // Audio state
  micMuted: boolean;
  deafened: boolean;

  // 🔊 New: input threshold (0–100 UI value)
  inputThreshold: number;

  // Actions
  setDevices: (devices: Devices) => void;
  setVolumes: (volumes: Volumes) => void;

  setInputThreshold: (value: number) => void;

  toggleMicMuted: () => void;
  toggleDeafened: () => void;
};

export const useAudioStore = create<AudioState>()((set) => ({
  // Devices
  inputDeviceId: null,
  outputDeviceId: null,
  videoDeviceId: null,

  // Volumes
  inputVolume: 100,
  outputVolume: 100,

  // Audio state
  micMuted: false,
  deafened: false,

  // 🔊 New: sensible default threshold
  inputThreshold: 30,

  // Actions
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

  setInputThreshold: (value: number) =>
    set(() => ({
      inputThreshold: value,
    })),

  toggleMicMuted: () =>
    set((state) => ({
      micMuted: !state.micMuted,
    })),

  toggleDeafened: () =>
    set((state) => ({
      deafened: !state.deafened,
    })),
}));
