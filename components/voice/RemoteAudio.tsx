// components/voice/RemoteAudio.tsx
"use client";

import { useEffect, useRef } from "react";

type RemoteAudioProps = {
  stream?: MediaStream | null;
  muted?: boolean;
  volume?: number; // 0..1 or 0..100, we'll clamp
  onLevel?: (level: number) => void;
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
    if (!el) return;

    // No stream -> stop and clear
    if (!stream) {
      el.pause();
      (el as any).srcObject = null;
      return;
    }

    // Clamp volume (support 0..1 or 0..100)
    const volNorm = volume > 1 ? volume / 100 : volume;
    el.muted = muted;
    el.volume = Math.max(0, Math.min(1, volNorm));

    // Only reset srcObject if it actually changed
    if (el.srcObject !== stream) {
      // Stop any current playback first to avoid AbortError
      el.pause();
      (el as any).srcObject = stream;
    }

    const tryPlay = () => {
      const p = el.play();
      if (p && typeof p.then === "function") {
        p.catch((err: any) => {
          // AbortError = new load() while play in-flight; ignore
          if (err?.name === "AbortError") {
            console.warn("[RemoteAudio] play aborted (new load), will retry");
            return;
          }
          console.warn("[RemoteAudio] autoplay failed", err);
        });
      }
    };

    // If element is already ready, try immediately, otherwise wait for canplay
    const onCanPlay = () => {
      tryPlay();
    };

    el.addEventListener("canplay", onCanPlay);

    // In case the stream is already ready:
    if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      tryPlay();
    }

    return () => {
      el.removeEventListener("canplay", onCanPlay);
      // Don't clear srcObject here; just pause
      el.pause();
    };
  }, [stream, muted, volume]);

  // Optional simple level meter (if you ever use onLevel)
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

  return (
     <audio
    ref={audioRef}
    controls   // 👈 add
    autoPlay
    playsInline
    style={{ width: 200 }}
  />
  );
}
