// components/voice/RemoteAudio.tsx
"use client";

import { useEffect, useRef } from "react";

type RemoteAudioProps = {
  stream?: MediaStream;
  volume?: number;      // 0–1
  muted?: boolean;
  onLevel?: (level: number) => void; // 0–1
};

export default function RemoteAudio({
  stream,
  volume = 1,
  muted = false,
  onLevel,
}: RemoteAudioProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // Attach stream + volume + playback
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !stream) return;

    // Attach the MediaStream
    el.srcObject = stream;

    // These must be set on the *element instance*, not as JSX props
    el.muted = muted;
    el.volume = Math.max(0, Math.min(1, volume ?? 1));

    // Debug:
    console.log(
      "[RemoteAudio] setup",
      { muted: el.muted, volume: el.volume },
      stream.getTracks().map((t) => ({ kind: t.kind, enabled: t.enabled }))
    );

    const playPromise = el.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise.catch((err) => {
        console.warn("[RemoteAudio] autoplay failed", err);
      });
    }

    return () => {
      if (audioRef.current === el) {
        el.pause();
        el.srcObject = null;
      }
    };
  }, [stream, muted, volume]);

  // Simple level meter using Web Audio
  useEffect(() => {
    if (!onLevel || !stream) return;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) {
      console.warn("[RemoteAudio] WebAudio not supported");
      return;
    }

    const audioCtx = new AudioCtx();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      const avg = sum / dataArray.length;
      const level = avg / 255;
      onLevel(level);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      try {
        source.disconnect();
        analyser.disconnect();
      } catch {
        // ignore
      }
      audioCtx.close();
    };
  }, [stream, onLevel]);

  // NOTE: `controls` left ON for debugging so you can see volume & play state.
  return <audio ref={audioRef} autoPlay playsInline controls />;
}
