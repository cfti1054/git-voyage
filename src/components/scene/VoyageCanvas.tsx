"use client";

import { Canvas } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { BUILDING_FOOTPRINT, CELL_SIZE, MAX_HEIGHT } from "@/lib/city";
import type { ContributionDay } from "@/lib/types";
import { City, useCityBounds } from "./City";
import {
  PaperPlane,
  type FlightBounds,
  type FlightControlsState,
} from "./PaperPlane";
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
  const flightBounds = useMemo<FlightBounds>(
    () => ({
      minX: BUILDING_FOOTPRINT / 2,
      maxX: bounds.cityWidth - CELL_SIZE + BUILDING_FOOTPRINT / 2,
      minZ: BUILDING_FOOTPRINT / 2,
      maxZ: bounds.cityDepth - CELL_SIZE + BUILDING_FOOTPRINT / 2,
      minY: 3,
      maxY: MAX_HEIGHT + 20,
    }),
    [bounds.cityDepth, bounds.cityWidth],
  );
  const start = useMemo(
    () =>
      new THREE.Vector3(
        flightBounds.minX + CELL_SIZE * 2,
        18,
        (flightBounds.minZ + flightBounds.maxZ) / 2,
      ),
    [flightBounds],
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
        <PaperPlane
          start={start}
          bounds={flightBounds}
          touchControls={touchControls}
        />
      </Canvas>
      <TouchControls controls={touchControls} />
    </>
  );
}
