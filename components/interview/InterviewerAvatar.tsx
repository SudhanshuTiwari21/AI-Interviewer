"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment } from "@react-three/drei";
import * as THREE from "three";

type Props = {
  speaking?: boolean;
  mood?: "balanced" | "friendly" | "bar-raiser";
  className?: string;
};

/**
 * Procedural low-poly 3D interviewer. No external model downloads — everything
 * is drawn with Three.js primitives so it renders instantly and never breaks
 * the demo due to CDN/network issues.
 */
export function InterviewerAvatar({ speaking, mood = "balanced", className }: Props) {
  return (
    <div className={className}>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0.2, 3.2], fov: 32 }}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={["#f5f3ff"]} />
        <ambientLight intensity={0.6} />
        <hemisphereLight args={["#ffffff", "#ede9fe", 0.8]} />
        <directionalLight
          position={[3, 4, 4]}
          intensity={1.1}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-3, 2, 2]} intensity={0.35} color="#c7d2fe" />

        <Suspense fallback={null}>
          <Character speaking={speaking} mood={mood} />
          <Environment preset="studio" />
          <ContactShadows
            position={[0, -1.15, 0]}
            opacity={0.35}
            scale={6}
            blur={2.4}
            far={2}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

function Character({
  speaking,
  mood,
}: {
  speaking?: boolean;
  mood: NonNullable<Props["mood"]>;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const mouthRef = useRef<THREE.Mesh>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  const eyebrowsRef = useRef<THREE.Group>(null);

  const colors = useMemo(() => {
    const moodPalettes: Record<
      NonNullable<Props["mood"]>,
      { shirt: string; jacket: string; accent: string }
    > = {
      balanced: { shirt: "#f1f5f9", jacket: "#1f2937", accent: "#7c3aed" },
      friendly: { shirt: "#fef3c7", jacket: "#1d4ed8", accent: "#10b981" },
      "bar-raiser": { shirt: "#e5e7eb", jacket: "#0f172a", accent: "#ef4444" },
    };
    return {
      skin: "#f4c89b",
      hair: "#1f1f1f",
      brow: "#1f1f1f",
      eye: "#0f172a",
      mouth: "#5b2a22",
      ...moodPalettes[mood],
    };
  }, [mood]);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    if (rootRef.current) {
      rootRef.current.position.y = Math.sin(t * 1.1) * 0.02;
      rootRef.current.rotation.z = Math.sin(t * 0.5) * 0.01;
    }
    if (headRef.current) {
      const targetY = Math.sin(t * 0.6) * 0.08;
      const targetX = Math.sin(t * 0.45) * 0.04;
      headRef.current.rotation.y = THREE.MathUtils.damp(
        headRef.current.rotation.y,
        targetY,
        2,
        delta,
      );
      headRef.current.rotation.x = THREE.MathUtils.damp(
        headRef.current.rotation.x,
        targetX,
        2,
        delta,
      );
    }

    const blink = Math.max(
      0,
      Math.sin(t * 1.7) > 0.985 ? 1 - (Math.sin(t * 1.7) - 0.985) * 40 : 1,
    );
    const eyeScaleY = Math.max(0.08, blink);
    if (leftEyeRef.current)
      leftEyeRef.current.scale.y = THREE.MathUtils.damp(
        leftEyeRef.current.scale.y,
        eyeScaleY,
        12,
        delta,
      );
    if (rightEyeRef.current)
      rightEyeRef.current.scale.y = THREE.MathUtils.damp(
        rightEyeRef.current.scale.y,
        eyeScaleY,
        12,
        delta,
      );

    if (mouthRef.current) {
      const openness = speaking
        ? 0.55 + Math.sin(t * 14) * 0.35 + Math.sin(t * 9) * 0.15
        : 0.08;
      const clamped = Math.max(0.05, Math.min(1.1, openness));
      mouthRef.current.scale.y = THREE.MathUtils.damp(
        mouthRef.current.scale.y,
        clamped,
        14,
        delta,
      );
      mouthRef.current.scale.x = THREE.MathUtils.damp(
        mouthRef.current.scale.x,
        speaking ? 1.05 + Math.sin(t * 8) * 0.06 : 1,
        10,
        delta,
      );
    }

    if (eyebrowsRef.current) {
      const moodOffset = mood === "bar-raiser" ? -0.02 : mood === "friendly" ? 0.015 : 0;
      eyebrowsRef.current.position.y = THREE.MathUtils.damp(
        eyebrowsRef.current.position.y,
        0.14 + moodOffset + (speaking ? Math.sin(t * 7) * 0.008 : 0),
        6,
        delta,
      );
    }
  });

  return (
    <group ref={rootRef} position={[0, -0.15, 0]}>
      {/* Backdrop ring to frame the avatar */}
      <mesh position={[0, 0.1, -1.2]} scale={[2.2, 2.2, 0.05]}>
        <circleGeometry args={[1, 48]} />
        <meshStandardMaterial color="#ede9fe" roughness={1} />
      </mesh>

      {/* Torso */}
      <group position={[0, -0.85, 0]}>
        <mesh>
          <sphereGeometry args={[0.72, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={colors.jacket} roughness={0.5} metalness={0.05} />
        </mesh>
        {/* Shirt V */}
        <mesh position={[0, 0.02, 0.42]}>
          <coneGeometry args={[0.18, 0.35, 32, 1, true]} />
          <meshStandardMaterial color={colors.shirt} roughness={0.6} />
        </mesh>
        {/* Lapel tie accent */}
        <mesh position={[0, -0.05, 0.48]} rotation={[0.1, 0, 0]}>
          <boxGeometry args={[0.05, 0.24, 0.02]} />
          <meshStandardMaterial color={colors.accent} roughness={0.4} />
        </mesh>
      </group>

      {/* Neck */}
      <mesh position={[0, -0.38, 0]}>
        <cylinderGeometry args={[0.16, 0.2, 0.24, 24]} />
        <meshStandardMaterial color={colors.skin} roughness={0.8} />
      </mesh>

      {/* Head group */}
      <group ref={headRef} position={[0, 0.1, 0]}>
        {/* Head */}
        <mesh>
          <sphereGeometry args={[0.55, 48, 48]} />
          <meshStandardMaterial color={colors.skin} roughness={0.75} />
        </mesh>
        {/* Ears */}
        <mesh position={[-0.52, 0, 0]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color={colors.skin} roughness={0.8} />
        </mesh>
        <mesh position={[0.52, 0, 0]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color={colors.skin} roughness={0.8} />
        </mesh>
        {/* Hair cap */}
        <mesh position={[0, 0.18, -0.03]} scale={[1.02, 0.7, 1.02]}>
          <sphereGeometry args={[0.55, 32, 32, 0, Math.PI * 2, 0, Math.PI / 1.7]} />
          <meshStandardMaterial color={colors.hair} roughness={0.6} />
        </mesh>
        {/* Hair front swoop */}
        <mesh position={[0.18, 0.32, 0.3]} rotation={[0.3, -0.2, -0.4]} scale={[0.25, 0.1, 0.2]}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial color={colors.hair} roughness={0.6} />
        </mesh>

        {/* Eyebrows */}
        <group ref={eyebrowsRef}>
          <mesh position={[-0.18, 0.14, 0.47]} rotation={[0, 0, 0.08]}>
            <boxGeometry args={[0.14, 0.03, 0.02]} />
            <meshStandardMaterial color={colors.brow} roughness={0.6} />
          </mesh>
          <mesh position={[0.18, 0.14, 0.47]} rotation={[0, 0, -0.08]}>
            <boxGeometry args={[0.14, 0.03, 0.02]} />
            <meshStandardMaterial color={colors.brow} roughness={0.6} />
          </mesh>
        </group>

        {/* Eyes (white sclera + pupil) */}
        <group>
          <mesh position={[-0.18, 0.05, 0.48]}>
            <sphereGeometry args={[0.085, 24, 24]} />
            <meshStandardMaterial color="#ffffff" roughness={0.35} />
          </mesh>
          <mesh ref={leftEyeRef} position={[-0.18, 0.05, 0.555]}>
            <sphereGeometry args={[0.04, 20, 20]} />
            <meshStandardMaterial color={colors.eye} roughness={0.3} />
          </mesh>

          <mesh position={[0.18, 0.05, 0.48]}>
            <sphereGeometry args={[0.085, 24, 24]} />
            <meshStandardMaterial color="#ffffff" roughness={0.35} />
          </mesh>
          <mesh ref={rightEyeRef} position={[0.18, 0.05, 0.555]}>
            <sphereGeometry args={[0.04, 20, 20]} />
            <meshStandardMaterial color={colors.eye} roughness={0.3} />
          </mesh>
        </group>

        {/* Nose */}
        <mesh position={[0, -0.05, 0.52]} rotation={[0.2, 0, 0]}>
          <coneGeometry args={[0.05, 0.14, 16]} />
          <meshStandardMaterial color={colors.skin} roughness={0.8} />
        </mesh>

        {/* Mouth */}
        <mesh ref={mouthRef} position={[0, -0.22, 0.48]}>
          <sphereGeometry args={[0.12, 24, 16, 0, Math.PI * 2, 0, Math.PI]} />
          <meshStandardMaterial color={colors.mouth} roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
}

export default InterviewerAvatar;
