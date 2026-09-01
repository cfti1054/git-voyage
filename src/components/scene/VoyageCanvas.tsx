"use client";

import { Canvas } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { ContributionDay } from "@/lib/types";
import { City, useCityBounds } from "./City";
import { PaperPlane, type FlightControlsState } from "./PaperPlane";
import { TouchControls } from "./TouchControls";

type VoyageCanvasProps = {
  days: ContributionDay[];
};

export function VoyageCanvas({ days }: VoyageCanvasProps) {
  const bounds = useCityBounds(days);
  const touchControls = useRef<FlightControlsState>({
    turn: 0,
    climb: 0,
    boost: false,
    lookDeltaX: 0,
    lookDeltaY: 0,
    followRequest: 0,
  });
  const start = useMemo(
    () => new THREE.Vector3(-14, 18, bounds.cityDepth / 2),
    [bounds.cityDepth],
  );

  return (
    <>
      <Canvas
        camera={{
          fov: 58,
          near: 0.1,
          far: 600,
          position: [-28, 24, bounds.cityDepth / 2 + 12],
        }}
        dpr={[1, 1.75]}
        onPointerDown={() => {
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
        }}
      >
        <color attach="background" args={["#9eb7c9"]} />
        <fog attach="fog" args={["#9eb7c9", 70, 260]} />
        <hemisphereLight args={["#d7e6f2", "#5c6b52", 0.85]} />
        <directionalLight
          position={[40, 60, 20]}
          intensity={1.15}
          color="#fff4d8"
        />
        <ambientLight intensity={0.22} />
        <City days={days} />
        <PaperPlane start={start} touchControls={touchControls} />
      </Canvas>
      <TouchControls controls={touchControls} />
    </>
  );
}
