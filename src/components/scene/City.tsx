"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { BUILDING_FOOTPRINT, toBuildingCells } from "@/lib/city";
import type { ContributionDay } from "@/lib/types";

type CityProps = {
  days: ContributionDay[];
};

export function City({ days }: CityProps) {
  const buildingMesh = useRef<THREE.InstancedMesh>(null);
  const parkMesh = useRef<THREE.InstancedMesh>(null);
  const city = useMemo(() => toBuildingCells(days), [days]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tint = useMemo(() => new THREE.Color(), []);

  useLayoutEffect(() => {
    const mesh = buildingMesh.current;
    if (!mesh) {
      return;
    }
    city.buildings.forEach((cell, index) => {
      dummy.position.set(cell.x, cell.height / 2, cell.z);
      dummy.scale.set(1, cell.height, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      mesh.setColorAt(index, tint.set(cell.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [city.buildings, dummy, tint]);

  useLayoutEffect(() => {
    const mesh = parkMesh.current;
    if (!mesh) {
      return;
    }
    city.parks.forEach((cell, index) => {
      dummy.position.set(cell.x, cell.height / 2, cell.z);
      dummy.scale.set(1.15, cell.height, 1.15);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [city.parks, dummy]);

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[city.cityWidth / 2, 0, city.cityDepth / 2]}
        receiveShadow
      >
        <planeGeometry args={[city.cityWidth + 80, city.cityDepth + 80]} />
        <meshStandardMaterial color="#3a3f45" roughness={0.92} />
      </mesh>
      {city.buildings.length > 0 ? (
        <instancedMesh
          ref={buildingMesh}
          args={[undefined, undefined, city.buildings.length]}
          castShadow
        >
          <boxGeometry args={[BUILDING_FOOTPRINT, 1, BUILDING_FOOTPRINT]} />
          <meshStandardMaterial roughness={0.42} metalness={0.06} />
        </instancedMesh>
      ) : null}
      {city.parks.length > 0 ? (
        <instancedMesh
          ref={parkMesh}
          args={[undefined, undefined, city.parks.length]}
        >
          <boxGeometry args={[BUILDING_FOOTPRINT, 1, BUILDING_FOOTPRINT]} />
          <meshStandardMaterial color="#5d7a55" roughness={0.95} />
        </instancedMesh>
      ) : null}
    </group>
  );
}

export function useCityBounds(days: ContributionDay[]) {
  return useMemo(() => toBuildingCells(days), [days]);
}
