// lib/voice/useAudioLevel.ts
"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Returns a normalized audio level 0..1 for a MediaStream.
 * Uses Web Audio API AnalyserNode on the given stream.
 */
export function useAudioLevel(stream: MediaStream | null): number {
  const [level, setLevel] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!stream) {
      setLevel(0);
      return;
    }

    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();

    analyser.fftSize = 512;
    const dataArray = new Uint8Array(analyser.fftSize);

    source.connect(analyser);

    const tick = () => {
      analyser.getByteTimeDomainData(dataArray);

      // Rough RMS
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const v = (dataArray[i] - 128) / 128; // -1..1
        sum += v * v;
      }
      const rms = Math.sqrt(sum / dataArray.length); // 0..~1
      setLevel(rms);

      rafRef.current = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      try {
        source.disconnect();
        analyser.disconnect();
        audioContext.close();
      } catch {
        // ignore
      }
    };
  }, [stream]);

  return level;
}
