"use client";

import { Text } from "@react-three/drei";
import type { ReactNode } from "react";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  BUILDING_FOOTPRINT,
  CELL_SIZE,
  ROWS_PER_YEAR,
  toBuildingCells,
} from "@/lib/city";
import type { BuildingCell, BuildingTheme, ContributionDay } from "@/lib/types";

type CityProps = {
  days: ContributionDay[];
};

type InstancedLayerProps = {
  cells: BuildingCell[];
  geometry: ReactNode;
  color: string;
  transform: (cell: BuildingCell, object: THREE.Object3D) => void;
  tintBodies?: boolean;
};

function InstancedLayer({
  cells,
  geometry,
  color,
  transform,
  tintBodies = false,
}: InstancedLayerProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tint = useMemo(() => new THREE.Color(), []);
  const base = useMemo(() => new THREE.Color(color), [color]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) {
      return;
    }
    cells.forEach((cell, index) => {
      dummy.position.set(0, 0, 0);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      transform(cell, dummy);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      if (tintBodies) {
        tint.copy(base).lerp(new THREE.Color(cell.color), 0.18);
        mesh.setColorAt(index, tint);
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [base, cells, dummy, tint, tintBodies, transform]);

  if (cells.length === 0) {
    return null;
  }

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, cells.length]} castShadow>
      {geometry}
      <meshStandardMaterial
        color={tintBodies ? "#ffffff" : color}
        roughness={0.68}
        metalness={0.03}
      />
    </instancedMesh>
  );
}

function bodyHeight(cell: BuildingCell, roofHeight: number) {
  return Math.max(0.8, cell.height - roofHeight);
}

function ThemeBuildings({
  theme,
  cells,
}: {
  theme: BuildingTheme;
  cells: BuildingCell[];
}) {
  if (theme === "european") {
    return (
      <group>
        <InstancedLayer
          cells={cells}
          geometry={<boxGeometry args={[1, 1, 1]} />}
          color="#c8b69a"
          tintBodies
          transform={(cell, object) => {
            const height = bodyHeight(cell, 1.5);
            object.position.set(cell.x, height / 2, cell.z);
            object.scale.set(BUILDING_FOOTPRINT, height, BUILDING_FOOTPRINT);
          }}
        />
        <InstancedLayer
          cells={cells}
          geometry={<coneGeometry args={[1.82, 1.5, 4]} />}
          color="#70483d"
          transform={(cell, object) => {
            const height = bodyHeight(cell, 1.5);
            object.position.set(cell.x, height + 0.75, cell.z);
            object.rotation.y = Math.PI / 4;
          }}
        />
        <InstancedLayer
          cells={cells}
          geometry={<boxGeometry args={[1, 1, 1]} />}
          color="#ead8b9"
          transform={(cell, object) => {
            const height = bodyHeight(cell, 1.5);
            object.position.set(cell.x, Math.max(0.3, height - 0.18), cell.z);
            object.scale.set(BUILDING_FOOTPRINT + 0.18, 0.18, BUILDING_FOOTPRINT + 0.18);
          }}
        />
      </group>
    );
  }

  if (theme === "joseon") {
    return (
      <group>
        <InstancedLayer
          cells={cells}
          geometry={<boxGeometry args={[1, 1, 1]} />}
          color="#9f6846"
          tintBodies
          transform={(cell, object) => {
            const height = bodyHeight(cell, 1.25);
            object.position.set(cell.x, 0.22 + height / 2, cell.z);
            object.scale.set(BUILDING_FOOTPRINT * 0.82, height, BUILDING_FOOTPRINT * 0.82);
          }}
        />
        <InstancedLayer
          cells={cells}
          geometry={<boxGeometry args={[1, 1, 1]} />}
          color="#77736b"
          transform={(cell, object) => {
            object.position.set(cell.x, 0.2, cell.z);
            object.scale.set(BUILDING_FOOTPRINT, 0.4, BUILDING_FOOTPRINT);
          }}
        />
        <InstancedLayer
          cells={cells}
          geometry={<coneGeometry args={[2.05, 0.78, 4]} />}
          color="#293b35"
          transform={(cell, object) => {
            const height = bodyHeight(cell, 1.25);
            object.position.set(cell.x, height + 0.83, cell.z);
            object.rotation.y = Math.PI / 4;
            object.scale.y = 0.82;
          }}
        />
        <InstancedLayer
          cells={cells}
          geometry={<coneGeometry args={[1.62, 0.58, 4]} />}
          color="#40564c"
          transform={(cell, object) => {
            const height = bodyHeight(cell, 1.25);
            object.position.set(cell.x, height + 1.2, cell.z);
            object.rotation.y = Math.PI / 4;
          }}
        />
      </group>
    );
  }

  if (theme === "japanese") {
    return (
      <group>
        <InstancedLayer
          cells={cells}
          geometry={<boxGeometry args={[1, 1, 1]} />}
          color="#d5c7a6"
          tintBodies
          transform={(cell, object) => {
            const height = bodyHeight(cell, 1.35);
            object.position.set(cell.x, height / 2, cell.z);
            object.scale.set(BUILDING_FOOTPRINT * 0.78, height, BUILDING_FOOTPRINT * 0.78);
          }}
        />
        <InstancedLayer
          cells={cells}
          geometry={<coneGeometry args={[2.08, 0.62, 4]} />}
          color="#4e4740"
          transform={(cell, object) => {
            const height = bodyHeight(cell, 1.35);
            object.position.set(cell.x, height + 0.31, cell.z);
            object.rotation.y = Math.PI / 4;
          }}
        />
        <InstancedLayer
          cells={cells}
          geometry={<coneGeometry args={[1.55, 0.52, 4]} />}
          color="#62584d"
          transform={(cell, object) => {
            const height = bodyHeight(cell, 1.35);
            object.position.set(cell.x, height + 0.78, cell.z);
            object.rotation.y = Math.PI / 4;
          }}
        />
        <InstancedLayer
          cells={cells}
          geometry={<boxGeometry args={[1, 1, 1]} />}
          color="#6b3f2c"
          transform={(cell, object) => {
            const height = bodyHeight(cell, 1.35);
            object.position.set(cell.x, height * 0.52, cell.z);
            object.scale.set(BUILDING_FOOTPRINT * 0.9, 0.13, BUILDING_FOOTPRINT * 0.9);
          }}
        />
      </group>
    );
  }

  return (
    <group>
      <InstancedLayer
        cells={cells}
        geometry={<boxGeometry args={[1, 1, 1]} />}
        color="#78909c"
        tintBodies
        transform={(cell, object) => {
          object.position.set(cell.x, cell.height / 2, cell.z);
          object.scale.set(BUILDING_FOOTPRINT, cell.height, BUILDING_FOOTPRINT);
        }}
      />
      <InstancedLayer
        cells={cells}
        geometry={<boxGeometry args={[1, 1, 1]} />}
        color="#b8d8df"
        transform={(cell, object) => {
          object.position.set(cell.x, cell.height + 0.12, cell.z);
          object.scale.set(BUILDING_FOOTPRINT * 0.7, 0.24, BUILDING_FOOTPRINT * 0.7);
        }}
      />
    </group>
  );
}

export function City({ days }: CityProps) {
  const parkMesh = useRef<THREE.InstancedMesh>(null);
  const city = useMemo(() => toBuildingCells(days), [days]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const buildingsByTheme = useMemo(
    () =>
      ({
        european: city.buildings.filter((cell) => cell.theme === "european"),
        joseon: city.buildings.filter((cell) => cell.theme === "joseon"),
        japanese: city.buildings.filter((cell) => cell.theme === "japanese"),
        modern: city.buildings.filter((cell) => cell.theme === "modern"),
      }) satisfies Record<BuildingTheme, BuildingCell[]>,
    [city.buildings],
  );

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
      {(Object.keys(buildingsByTheme) as BuildingTheme[]).map((theme) => (
        <ThemeBuildings key={theme} theme={theme} cells={buildingsByTheme[theme]} />
      ))}
      {city.parks.length > 0 ? (
        <instancedMesh
          ref={parkMesh}
          args={[undefined, undefined, city.parks.length]}
        >
          <boxGeometry args={[BUILDING_FOOTPRINT, 1, BUILDING_FOOTPRINT]} />
          <meshStandardMaterial color="#5d7a55" roughness={0.95} />
        </instancedMesh>
      ) : null}
      {city.years.slice(1).map(({ year }, index) => {
        const z = (index + 1) * ROWS_PER_YEAR * CELL_SIZE - CELL_SIZE / 2;
        return (
          <mesh key={`divider-${year}`} position={[city.cityWidth / 2, 0.08, z]}>
            <boxGeometry args={[city.cityWidth + 5, 0.12, 0.16]} />
            <meshStandardMaterial color="#d9cfb5" roughness={0.9} />
          </mesh>
        );
      })}
      {city.years.map(({ year, z }) => (
        <Text
          key={year}
          position={[-5.5, 0.1, z - CELL_SIZE / 2]}
          rotation={[-Math.PI / 2, 0, Math.PI / 2]}
          fontSize={2.1}
          color="#f1ead8"
          anchorX="center"
          anchorY="middle"
        >
          {year}
        </Text>
      ))}
    </group>
  );
}

export function useCityBounds(days: ContributionDay[]) {
  return useMemo(() => toBuildingCells(days), [days]);
}
