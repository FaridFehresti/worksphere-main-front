"use client";

import {
  Suspense,
  useMemo,
  useRef,
  type MutableRefObject,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

type MeshSphereBackgroundProps = {
  className?: string;
};

/**
 * Full-screen background with:
 * - Wavy dotted sphere
 * - Two Saturn-like rings
 * - Small glowing comet that flies in from off-screen, hits the sphere,
 *   triggers a smooth ripple, then disappears.
 */
export default function MeshSphereBackground({
  className,
}: MeshSphereBackgroundProps) {
  return (
    <div
      className={`
        pointer-events-none
        fixed inset-0 -z-20
        overflow-hidden
        ${className ?? ""}
      `}
    >
      <Canvas
        camera={{ position: [0, 0.5, 10], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          {/* slight global tilt for 3D feel */}
          <group rotation={[0.32, -0.3, 0]}>
            <WavySphereWithRingsAndComet />
          </group>
        </Suspense>
      </Canvas>
    </div>
  );
}

type ImpactState = {
  center: THREE.Vector3;
  start: number;
};

function WavySphereWithRingsAndComet() {
  const groupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const ringMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const ringMatOuterRef = useRef<THREE.MeshBasicMaterial>(null);

  // ripple / impact state: set by comet on impact
  const impactStateRef = useRef<ImpactState | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const SPHERE_RADIUS = 1.4;

  const { geometry, basePositions } = useMemo(() => {
    const geo = new THREE.SphereGeometry(SPHERE_RADIUS, 96, 96);
    const base = (geo.attributes.position.array as Float32Array).slice();
    return { geometry: geo, basePositions: base };
  }, []);

  useFrame(({ clock }) => {
    const globalTime = clock.getElapsedTime();
    const group = groupRef.current;
    const pointsMat = materialRef.current;
    const ringMat = ringMatRef.current;
    const ringMatOuter = ringMatOuterRef.current;
    if (!group || !pointsMat) return;

    // ---- entrance (scale + opacity) ----
    if (startTimeRef.current === null) {
      startTimeRef.current = globalTime;
    }
    const localT = globalTime - startTimeRef.current;
    const introDuration = 1.2;
    const rawProgress = Math.min(localT / introDuration, 1);
    const eased = rawProgress * rawProgress * (3 - 2 * rawProgress); // smoothstep

    const baseOpacitySphere = 0.75;
    pointsMat.opacity = baseOpacitySphere * eased;
    if (ringMat) ringMat.opacity = 0.35 * eased;
    if (ringMatOuter) ringMatOuter.opacity = 0.18 * eased;

    const baseScale = 0.7;
    const targetScale = 1.0;
    const scale = baseScale + (targetScale - baseScale) * eased;
    group.scale.setScalar(scale);

    // ---- slow spin of whole system ----
    const t = globalTime;
    group.rotation.y += 0.0009;
    group.rotation.x += 0.00035;

    // ---- surface waves + ripple from impact ----
    const pts = pointsRef.current;
    if (!pts) return;

    const posAttr = geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    // base waves
    const freq = 1.25;
    const amp = 0.035;
    const tSlow1 = t * 0.3;
    const tSlow2 = t * 0.45;

    const impactState = impactStateRef.current;
    const rippleDuration = 2.0;
    const rippleAmp = 0.08;         // slightly reduced so it doesn't feel "dented"
    const rippleWaveSpeed = 2.2;
    const rippleWidth = 0.55;

    let rippleAge = 0;
    let impactCenter: THREE.Vector3 | null = null;

    if (impactState) {
      rippleAge = t - impactState.start;
      if (rippleAge > rippleDuration) {
        // end of ripple – everything fully back to normal
        impactStateRef.current = null;
      } else {
        impactCenter = impactState.center;
      }
    }

    for (let i = 0; i < arr.length; i += 3) {
      const x0 = basePositions[i];
      const y0 = basePositions[i + 1];
      const z0 = basePositions[i + 2];

      const baseWave =
        Math.sin(tSlow1 + (x0 + y0 + z0) * freq) * amp +
        Math.sin(tSlow2 + y0 * 1.4) * (amp * 0.45);

      let ripple = 0;
      if (impactCenter && rippleAge <= rippleDuration) {
        // distance from impact center on sphere surface
        const dx = x0 - impactCenter.x;
        const dy = y0 - impactCenter.y;
        const dz = z0 - impactCenter.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        const rippleRadius = rippleWaveSpeed * rippleAge;
        const distFromWaveFront = dist - rippleRadius;

        // Gaussian falloff around the wave front
        const falloff = Math.exp(
          -((distFromWaveFront * distFromWaveFront) /
            (rippleWidth * rippleWidth))
        );

        const life = 1 - rippleAge / rippleDuration; // fade out over time
        const wavePhase = 8 * distFromWaveFront;     // number of ripples

        ripple =
          Math.sin(wavePhase) *
          rippleAmp *
          falloff *
          life *
          (0.6 + 0.4 * Math.sin(rippleAge * 4));
      }

      const rScale = 1 + baseWave + ripple;

      // keep it glued to a sphere radius; no permanent deformation
      arr[i] = (x0 / SPHERE_RADIUS) * SPHERE_RADIUS * rScale;
      arr[i + 1] = (y0 / SPHERE_RADIUS) * SPHERE_RADIUS * rScale;
      arr[i + 2] = (z0 / SPHERE_RADIUS) * SPHERE_RADIUS * rScale;
    }

    posAttr.needsUpdate = true;
  });

  return (
    <group ref={groupRef}>
      {/* dotted wavy sphere */}
      <points ref={pointsRef} geometry={geometry}>
        <pointsMaterial
          ref={materialRef}
          size={0.026}
          color={"#B5F3FF"}
          sizeAttenuation
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* inner ring */}
      <mesh rotation={[Math.PI / 2.2, 0, 0.4]}>
        <ringGeometry args={[1.9, 2.2, 160]} />
        <meshBasicMaterial
          ref={ringMatRef}
          color={"#6CCFF6"}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* outer ring */}
      <mesh rotation={[Math.PI / 2.2, 0, 0.4]}>
        <ringGeometry args={[2.4, 3.0, 200]} />
        <meshBasicMaterial
          ref={ringMatOuterRef}
          color={"#6CCFF6"}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* small glowing comet that flies in, hits, ripples, then disappears */}
      <Comet impactStateRef={impactStateRef} sphereRadius={SPHERE_RADIUS} />
    </group>
  );
}

// ---- Glowing comet / asteroid (smooth orb with aura, no line) ----
function Comet({
  impactStateRef,
  sphereRadius,
}: {
  impactStateRef: MutableRefObject<ImpactState | null>;
  sphereRadius: number;
}) {
  const cometGroupRef = useRef<THREE.Group>(null);
  const coreMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const haloMatRef = useRef<THREE.MeshBasicMaterial>(null);

  // state refs
  const phaseRef = useRef<"idle" | "flying" | "bursting">("idle");
  const flightStartRef = useRef<number>(0);
  const burstStartRef = useRef<number>(0);
  const nextSpawnTimeRef = useRef<number>(3 + Math.random() * 5); // first comet after 3–8s

  const startPosRef = useRef<THREE.Vector3 | null>(null);
  const impactPosRef = useRef<THREE.Vector3 | null>(null);
  const flightDurationRef = useRef<number>(1.6); // seconds

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const cometGroup = cometGroupRef.current;
    const coreMat = coreMatRef.current;
    const haloMat = haloMatRef.current;
    if (!cometGroup || !coreMat || !haloMat) return;

    const phase = phaseRef.current;

    // helper to hide comet
    const hideComet = () => {
      coreMat.opacity = 0;
      haloMat.opacity = 0;
    };

    // ----- IDLE: schedule comet ----- 
    if (phase === "idle") {
      hideComet();

      // don't spawn another while ripple is active
      if (impactStateRef.current) return;

      if (t >= nextSpawnTimeRef.current) {
        // pick a random impact direction on sphere surface
        const dir = new THREE.Vector3(
          Math.random() * 2 - 1,
          Math.random() * 2 - 1,
          Math.random() * 2 - 1
        ).normalize();

        const impactPos = dir.clone().multiplyScalar(sphereRadius);
        impactPosRef.current = impactPos;

        // start far away along that direction (off-screen)
        const startDistance = 7.5; // how far away the comet starts
        const startPos = dir.clone().multiplyScalar(startDistance);
        startPosRef.current = startPos;

        // flight duration 1.3–2.0s
        flightDurationRef.current = 1.3 + Math.random() * 0.7;

        flightStartRef.current = t;
        phaseRef.current = "flying";
      }

      return;
    }

    // ----- FLYING: lerp from off-screen to sphere surface ----- 
    if (phase === "flying") {
      const startPos = startPosRef.current;
      const impactPos = impactPosRef.current;
      if (!startPos || !impactPos) return;

      const flightDuration = flightDurationRef.current;
      const flightAge = t - flightStartRef.current;
      const raw = Math.min(flightAge / flightDuration, 1);
      const eased = raw * raw * (3 - 2 * raw); // smoothstep

      const currentPos = new THREE.Vector3().lerpVectors(
        startPos,
        impactPos,
        eased
      );
      cometGroup.position.copy(currentPos);

      // smaller comet with subtle growth
      const baseScale = 0.7;
      const scale = baseScale + 0.2 * eased;
      cometGroup.scale.setScalar(scale);

      const coreOpacity = 0.2 + 0.7 * eased;
      const haloOpacity = 0.08 + 0.35 * eased;
      coreMat.opacity = coreOpacity;
      haloMat.opacity = haloOpacity;

      // spin for nice look
      cometGroup.rotation.y += 0.03;
      cometGroup.rotation.x += 0.02;

      // reached impact
      if (raw >= 1) {
        // trigger ripple / impact
        impactStateRef.current = {
          center: impactPos.clone(),
          start: t,
        };

        // start burst animation
        burstStartRef.current = t;
        phaseRef.current = "bursting";
      }

      return;
    }

    // ----- BURSTING: small pop, no marks ----- 
    if (phase === "bursting") {
      const burstAge = t - burstStartRef.current;
      const burstDuration = 0.45;
      const raw = Math.min(burstAge / burstDuration, 1);
      const inv = 1 - raw;

      const impactPos = impactPosRef.current;
      if (impactPos) {
        cometGroup.position.copy(impactPos);
      }

      // tiny explosion: slight scale up, then fade
      const scale = 0.7 + 0.5 * raw;
      cometGroup.scale.setScalar(scale);

      const coreOpacity = inv * (1 + 0.2 * Math.sin(raw * Math.PI));
      const haloOpacity = inv * 0.4;
      coreMat.opacity = coreOpacity;
      haloMat.opacity = haloOpacity;

      cometGroup.rotation.y += 0.06;
      cometGroup.rotation.x += 0.04;

      if (burstAge >= burstDuration) {
        // end burst, go idle and schedule next comet
        phaseRef.current = "idle";
        nextSpawnTimeRef.current = t + 6 + Math.random() * 6; // 6–12s between impacts
        hideComet();
      }

      return;
    }
  });

  return (
    <group ref={cometGroupRef}>
      {/* core tiny glowing ball */}
      <mesh>
        <sphereGeometry args={[0.06, 24, 24]} />
        <meshBasicMaterial
          ref={coreMatRef}
          color={"#F5E1FF"} // soft, warm-ish core
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* aura / halo */}
      <mesh>
        <sphereGeometry args={[0.14, 24, 24]} />
        <meshBasicMaterial
          ref={haloMatRef}
          color={"#6CCFF6"} // icy cyan halo
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
