"use client";

import { useFrame, useThree } from "@react-three/fiber";
import type { RefObject } from "react";
import { useEffect, useRef } from "react";
import * as THREE from "three";

type KeyMap = Record<string, boolean>;

export type FlightControlsState = {
  turn: number;
  climb: number;
  boost: boolean;
  lookDeltaX: number;
  lookDeltaY: number;
  followRequest: number;
};

export type FlightBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
};

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
  bounds: FlightBounds;
  touchControls?: RefObject<FlightControlsState>;
};

const MOUSE_SENSITIVITY = 0.0035;
const CAMERA_ROTATION_DAMPING = 9;
const MAX_POINTER_DELTA = 80;
const AUTO_PILOT_DELAY = 3;

export function PaperPlane({
  start,
  bounds,
  touchControls,
}: PaperPlaneProps) {
  const group = useRef<THREE.Group>(null);
  const keys = useKeys();
  const { camera, gl } = useThree();
  const yaw = useRef(-Math.PI / 2);
  const pitch = useRef(-0.08);
  const viewYaw = useRef(-Math.PI / 2);
  const viewPitch = useRef(-0.08);
  const targetViewYaw = useRef(-Math.PI / 2);
  const targetViewPitch = useRef(-0.08);
  const followCamera = useRef(true);
  const vWasDown = useRef(false);
  const handledFollowRequest = useRef(0);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const position = useRef(start.clone());
  const lookPoint = useRef(new THREE.Vector3());
  const cameraTarget = useRef(new THREE.Vector3());
  const forward = useRef(new THREE.Vector3());
  const viewForward = useRef(new THREE.Vector3());
  const idleTime = useRef(0);
  const autoPilotPhase = useRef(0);

  useEffect(() => {
    const canvas = gl.domElement;

    const setPointer = (x: number, y: number) => {
      lastPointer.current = { x, y };
    };

    const onPointerMove = (event: PointerEvent) => {
      if (lastPointer.current === null) {
        setPointer(event.clientX, event.clientY);
        return;
      }

      const deltaX = THREE.MathUtils.clamp(
        event.clientX - lastPointer.current.x,
        -MAX_POINTER_DELTA,
        MAX_POINTER_DELTA,
      );
      const deltaY = THREE.MathUtils.clamp(
        event.clientY - lastPointer.current.y,
        -MAX_POINTER_DELTA,
        MAX_POINTER_DELTA,
      );
      setPointer(event.clientX, event.clientY);

      if (deltaX === 0 && deltaY === 0) {
        return;
      }

      followCamera.current = false;
      targetViewYaw.current -= deltaX * MOUSE_SENSITIVITY;
      targetViewPitch.current = THREE.MathUtils.clamp(
        targetViewPitch.current - deltaY * MOUSE_SENSITIVITY,
        -0.72,
        0.52,
      );
    };

    const onPointerEnter = (event: PointerEvent) => {
      setPointer(event.clientX, event.clientY);
    };

    const onPointerLeave = () => {
      lastPointer.current = null;
    };

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerenter", onPointerEnter);
    canvas.addEventListener("pointerleave", onPointerLeave);

    return () => {
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerenter", onPointerEnter);
      canvas.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [gl]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const pressed = keys.current;
    const touch = touchControls?.current;
    const keyboardTurn =
      (pressed.KeyD || pressed.ArrowRight ? 1 : 0) -
      (pressed.KeyA || pressed.ArrowLeft ? 1 : 0);
    const keyboardClimb =
      (pressed.KeyW || pressed.ArrowUp ? 1 : 0) -
      (pressed.KeyS || pressed.ArrowDown ? 1 : 0);
    const touchTurn = touch?.turn ?? 0;
    const touchClimb = touch?.climb ?? 0;
    const manualBoost =
      pressed.ShiftLeft || pressed.ShiftRight || touch?.boost === true;
    const hasFlightInput =
      keyboardTurn !== 0 ||
      keyboardClimb !== 0 ||
      Math.abs(touchTurn) > 0.08 ||
      Math.abs(touchClimb) > 0.08 ||
      manualBoost;

    if (hasFlightInput) {
      idleTime.current = 0;
    } else {
      idleTime.current += dt;
    }

    const autoPilot = idleTime.current >= AUTO_PILOT_DELAY;
    let turn = THREE.MathUtils.clamp(keyboardTurn + touchTurn, -1, 1);
    let climb = THREE.MathUtils.clamp(keyboardClimb + touchClimb, -1, 1);
    let boost = manualBoost ? 1.75 : 1;

    if (autoPilot) {
      autoPilotPhase.current += dt;
      followCamera.current = true;
      const wanderingTurn =
        Math.sin(autoPilotPhase.current * 0.42) * 0.62 +
        Math.sin(autoPilotPhase.current * 0.17) * 0.22;
      climb =
        Math.sin(autoPilotPhase.current * 0.28) * 0.34 +
        Math.sin(autoPilotPhase.current * 0.11) * 0.12;
      boost = 1.15;

      const distanceToEdge = Math.min(
        position.current.x - bounds.minX,
        bounds.maxX - position.current.x,
        position.current.z - bounds.minZ,
        bounds.maxZ - position.current.z,
      );
      const edgeMargin = Math.min(
        28,
        (bounds.maxX - bounds.minX) * 0.25,
        (bounds.maxZ - bounds.minZ) * 0.25,
      );
      const edgeInfluence = THREE.MathUtils.clamp(
        1 - distanceToEdge / Math.max(edgeMargin, 1),
        0,
        1,
      );

      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerZ = (bounds.minZ + bounds.maxZ) / 2;
      const desiredYaw = Math.atan2(
        -(centerX - position.current.x),
        -(centerZ - position.current.z),
      );
      const yawError = Math.atan2(
        Math.sin(desiredYaw - yaw.current),
        Math.cos(desiredYaw - yaw.current),
      );
      const centerTurn = THREE.MathUtils.clamp(-yawError * 1.2, -1, 1);
      turn = THREE.MathUtils.lerp(
        wanderingTurn,
        centerTurn,
        edgeInfluence,
      );

      const targetAltitude = THREE.MathUtils.lerp(
        bounds.minY,
        bounds.maxY,
        0.42,
      );
      climb += THREE.MathUtils.clamp(
        (targetAltitude - position.current.y) * 0.035,
        -0.45,
        0.45,
      );
    }

    if (touch && (touch.lookDeltaX !== 0 || touch.lookDeltaY !== 0)) {
      followCamera.current = false;
      targetViewYaw.current -= touch.lookDeltaX * MOUSE_SENSITIVITY;
      targetViewPitch.current = THREE.MathUtils.clamp(
        targetViewPitch.current - touch.lookDeltaY * MOUSE_SENSITIVITY,
        -0.72,
        0.52,
      );
      touch.lookDeltaX = 0;
      touch.lookDeltaY = 0;
    }

    const touchFollowRequested =
      touch && touch.followRequest !== handledFollowRequest.current;
    if (pressed.KeyV || touchFollowRequested) {
      if (!vWasDown.current) {
        followCamera.current = true;
        targetViewYaw.current = yaw.current;
        targetViewPitch.current = pitch.current;
        vWasDown.current = true;
      }
      if (touch) {
        handledFollowRequest.current = touch.followRequest;
      }
    } else {
      vWasDown.current = false;
    }

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
    position.current.x = THREE.MathUtils.clamp(
      position.current.x,
      bounds.minX,
      bounds.maxX,
    );
    position.current.y = THREE.MathUtils.clamp(
      position.current.y,
      bounds.minY,
      bounds.maxY,
    );
    position.current.z = THREE.MathUtils.clamp(
      position.current.z,
      bounds.minZ,
      bounds.maxZ,
    );

    if (group.current) {
      group.current.position.copy(position.current);
      group.current.rotation.set(
        pitch.current,
        yaw.current,
        -turn * 0.38,
        "YXZ",
      );
    }

    if (followCamera.current) {
      targetViewYaw.current = yaw.current;
      targetViewPitch.current = pitch.current;
    }

    viewYaw.current = THREE.MathUtils.damp(
      viewYaw.current,
      targetViewYaw.current,
      CAMERA_ROTATION_DAMPING,
      dt,
    );
    viewPitch.current = THREE.MathUtils.damp(
      viewPitch.current,
      targetViewPitch.current,
      CAMERA_ROTATION_DAMPING,
      dt,
    );

    const cameraYaw = viewYaw.current;
    const cameraPitch = viewPitch.current;

    cameraTarget.current
      .set(0, 3.4, 11)
      .applyEuler(
        new THREE.Euler(cameraPitch * 0.35, cameraYaw, 0, "YXZ"),
      )
      .add(position.current);
    camera.position.lerp(cameraTarget.current, 1 - Math.pow(0.012, dt));
    viewForward.current
      .set(0, 0, -1)
      .applyEuler(new THREE.Euler(cameraPitch, cameraYaw, 0, "YXZ"));
    lookPoint.current
      .copy(position.current)
      .addScaledVector(viewForward.current, 10);
    camera.lookAt(lookPoint.current);
  });

  return (
    <group ref={group} position={start.toArray()}>
      <PaperDart />
    </group>
  );
}
