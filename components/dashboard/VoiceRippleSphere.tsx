// components/dashboard/VoiceRippleSphere.tsx
"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";

type VoiceRippleSphereProps = {
  /** 0–1 (ish) normalized voice level from useStreamLevel */
  level: number;
  className?: string;
};

export default function VoiceRippleSphere({
  level,
  className,
}: VoiceRippleSphereProps) {
  return (
    <div className={className} style={{ width: "100%", height: "100%" }}>
      <Canvas
        camera={{ position: [0, 0.25, 3.0], fov: 38 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <group rotation={[0.3, -0.25, 0]}>
            <InnerVoiceSphere level={level} />
          </group>
        </Suspense>
      </Canvas>
    </div>
  );
}

function InnerVoiceSphere({ level }: { level: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);

  const startTimeRef = useRef<number | null>(null);
  const smoothedLevelRef = useRef(0);

  const SPHERE_RADIUS = 1.0;

  const { geometry, basePositions } = useMemo(() => {
    const geo = new THREE.SphereGeometry(SPHERE_RADIUS, 90, 90);
    const base = (geo.attributes.position.array as Float32Array).slice();
    return { geometry: geo, basePositions: base };
  }, []);

  // Fixed source direction (front-ish)
  const centerDir = useMemo(
    () => new THREE.Vector3(0.0, 0.35, 1.0).normalize(),
    [],
  );
  const center = useMemo(
    () => centerDir.clone().multiplyScalar(SPHERE_RADIUS),
    [centerDir],
  );

  // Make the colors VERY different so it’s obvious:
  // idle = deep primary, active = bright accent.
  const baseColor = useMemo(() => new THREE.Color("#0E5A74"), []); // primary-900
  const activeColor = useMemo(() => new THREE.Color("#98CE00"), []); // accent-500

  useFrame(({ clock }) => {
    const tGlobal = clock.getElapsedTime();
    const group = groupRef.current;
    const mat = materialRef.current;
    if (!group || !mat) return;

    // ---------- intro fade / scale ----------
    if (startTimeRef.current === null) {
      startTimeRef.current = tGlobal;
    }
    const localT = tGlobal - startTimeRef.current;
    const introDuration = 0.9;
    const introRaw = Math.min(1, localT / introDuration);
    const intro = introRaw * introRaw * (3 - 2 * introRaw); // smoothstep

    const baseScale = 0.75;
    const targetScale = 1.0;
    const scale = baseScale + (targetScale - baseScale) * intro;
    group.scale.setScalar(scale);

    // ---------- smooth the mic level ----------
    // boost so normal speech lands around ~0.6–0.9
    const raw = Math.max(0, Math.min(1.5, level * 1.4));
    const prev = smoothedLevelRef.current;
    const smoothed = prev * 0.88 + raw * 0.12; // smooth decay to idle
    smoothedLevelRef.current = smoothed;

    // ---------- color: strong cyan → bright lime ----------
    // super simple mapping so it's OBVIOUS:
    // - smoothed ~0   -> baseColor
    // - smoothed ~0.5 -> mid blend
    // - smoothed >=1  -> fully activeColor
    const colorT = Math.min(1, smoothed * 1.8);
    const newColor = baseColor.clone().lerp(activeColor, colorT);
    mat.color.set(newColor);

    // opacity: idle = subtle, speaking = bright
    mat.opacity = 0.18 + 0.35 * intro + 0.5 * colorT;

    // ---------- slow overall spin ----------
    group.rotation.y += 0.0012;
    group.rotation.x += 0.0005;

    const pts = pointsRef.current;
    if (!pts) return;

    const posAttr = geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    // ---------- idle wobble (very subtle) ----------
    const idleFreq = 1.0;
    const idleAmp = 0.01;
    const t1 = tGlobal * 0.25;
    const t2 = tGlobal * 0.33;

    // ---------- voice-driven wave (YOUR tuned values) ----------
    const waveFreq = 10.0; // number of bands across sphere
    const waveSpeed = 2.7; // how fast wave travels
    const baseVoiceAmp = 0.0; // idle amplitude
    const extraVoiceAmp = 1.5; // extra when speaking
    const voiceAmp = baseVoiceAmp + extraVoiceAmp * smoothed;

    const damping = 0.7 + 0.25 * smoothed; // louder = less damping

    for (let i = 0; i < arr.length; i += 3) {
      const x0 = basePositions[i];
      const y0 = basePositions[i + 1];
      const z0 = basePositions[i + 2];

      const idle =
        Math.sin(t1 + (x0 + y0 + z0) * idleFreq) * idleAmp +
        Math.sin(t2 + y0 * 1.3) * (idleAmp * 0.6);

      // distance from our fixed “source” point
      const dx = x0 - center.x;
      const dy = y0 - center.y;
      const dz = z0 - center.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz); // 0 → ~2R

      // normalize to [0..1] across sphere
      const normDist = dist / (2 * SPHERE_RADIUS);

      // traveling wave across full sphere
      const phase = normDist * waveFreq * Math.PI * 2 - tGlobal * waveSpeed;

      // smooth falloff so whole sphere breathes
      const falloff = 0.35 + 0.65 * Math.cos(normDist * Math.PI);

      const ripple = Math.sin(phase) * voiceAmp * falloff * damping;

      const rScale = 1 + idle + ripple;

      arr[i] = (x0 / SPHERE_RADIUS) * SPHERE_RADIUS * rScale;
      arr[i + 1] = (y0 / SPHERE_RADIUS) * SPHERE_RADIUS * rScale;
      arr[i + 2] = (z0 / SPHERE_RADIUS) * SPHERE_RADIUS * rScale;
    }

    posAttr.needsUpdate = true;
  });

  return (
    <group ref={groupRef}>
      <points ref={pointsRef} geometry={geometry}>
        <pointsMaterial
          ref={materialRef}
          size={0.032}
          color="#0E5A74" // deep primary idle color
          sizeAttenuation
          transparent
          opacity={0}
          depthWrite={false}
          vertexColors={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}
