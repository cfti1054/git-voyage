"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

type KeyMap = Record<string, boolean>;

function useKeys() {
  const keys = useRef<KeyMap>({});

  useEffect(() => {
    const onDown = (event: KeyboardEvent) => {
      keys.current[event.code] = true;
    };
    const onUp = (event: KeyboardEvent) => {
      keys.current[event.code] = false;
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  return keys;
}

function PaperDart() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -0.15]}>
        <coneGeometry args={[0.16, 1.35, 3]} />
        <meshStandardMaterial color="#f6f1e6" roughness={0.55} />
      </mesh>
      <mesh rotation={[0, 0, 0.42]} position={[0.38, 0.02, 0.12]}>
        <boxGeometry args={[0.85, 0.03, 0.55]} />
        <meshStandardMaterial color="#efe6d4" roughness={0.6} />
      </mesh>
      <mesh rotation={[0, 0, -0.42]} position={[-0.38, 0.02, 0.12]}>
        <boxGeometry args={[0.85, 0.03, 0.55]} />
        <meshStandardMaterial color="#efe6d4" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.08, 0.2]}>
        <boxGeometry args={[0.06, 0.22, 0.45]} />
        <meshStandardMaterial color="#d9c8a7" roughness={0.5} />
      </mesh>
    </group>
  );
}

type PaperPlaneProps = {
  start: THREE.Vector3;
};

export function PaperPlane({ start }: PaperPlaneProps) {
  const group = useRef<THREE.Group>(null);
  const keys = useKeys();
  const { camera } = useThree();
  const yaw = useRef(-Math.PI / 2);
  const pitch = useRef(-0.08);
  const position = useRef(start.clone());
  const lookPoint = useRef(new THREE.Vector3());
  const cameraTarget = useRef(new THREE.Vector3());
  const forward = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const pressed = keys.current;
    const turn =
      (pressed.KeyD || pressed.ArrowRight ? 1 : 0) -
      (pressed.KeyA || pressed.ArrowLeft ? 1 : 0);
    const climb =
      (pressed.KeyW || pressed.ArrowUp ? 1 : 0) -
      (pressed.KeyS || pressed.ArrowDown ? 1 : 0);
    const boost = pressed.ShiftLeft || pressed.ShiftRight ? 1.75 : 1;

    yaw.current -= turn * 1.35 * dt;
    pitch.current = THREE.MathUtils.clamp(
      pitch.current + climb * 0.85 * dt,
      -0.72,
      0.52,
    );

    forward.current.set(0, 0, -1).applyEuler(
      new THREE.Euler(pitch.current, yaw.current, 0, "YXZ"),
    );
    position.current.addScaledVector(forward.current, 15 * boost * dt);
    position.current.y = Math.max(2.6, position.current.y);

    if (group.current) {
      group.current.position.copy(position.current);
      group.current.rotation.set(
        pitch.current,
        yaw.current,
        -turn * 0.38,
        "YXZ",
      );
    }

    cameraTarget.current
      .set(0, 3.4, 11)
      .applyEuler(new THREE.Euler(pitch.current * 0.35, yaw.current, 0, "YXZ"))
      .add(position.current);
    camera.position.lerp(cameraTarget.current, 1 - Math.pow(0.012, dt));
    lookPoint.current
      .copy(position.current)
      .addScaledVector(forward.current, 10);
    camera.lookAt(lookPoint.current);
  });

  return (
    <group ref={group} position={start.toArray()}>
      <PaperDart />
    </group>
  );
}
