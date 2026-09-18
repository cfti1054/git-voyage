"use client";

import { Canvas } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  BUILDING_FOOTPRINT,
  CELL_SIZE,
  MAX_HEIGHT,
  MIN_HEIGHT,
} from "@/lib/city";
import type { CommitDetail, ContributionDay } from "@/lib/types";
import { City, useCityBounds } from "./City";
import {
  PaperPlane,
  type FlightBounds,
  type FlightControlsState,
  type FlightObstacle,
  type FlightObstacleMap,
  flightObstacleKey,
} from "./PaperPlane";
import { TouchControls } from "./TouchControls";

type VoyageCanvasProps = {
  days: ContributionDay[];
  login: string;
  source: "github" | "demo";
};

type CommitPanelState = {
  date: string;
  status: "loading" | "ready" | "error";
  commits: CommitDetail[];
  error?: string;
};

export function VoyageCanvas({ days, login, source }: VoyageCanvasProps) {
  const bounds = useCityBounds(days);
  const [nearbyDate, setNearbyDate] = useState<string | null>(null);
  const [commitPanel, setCommitPanel] = useState<CommitPanelState | null>(null);
  const commitCache = useRef(new Map<string, CommitDetail[]>());
  const touchControls = useRef<FlightControlsState>({
    turn: 0,
    climb: 0,
    boost: false,
    lookDeltaX: 0,
    lookDeltaY: 0,
    followRequest: 0,
  });
  const obstacles = useMemo<FlightObstacleMap>(() => {
    const map = new Map<string, FlightObstacle>();
    for (const building of bounds.buildings) {
      map.set(
        flightObstacleKey(
          Math.round(building.x / CELL_SIZE),
          Math.round(building.z / CELL_SIZE),
        ),
        {
          date: building.date,
          x: building.x,
          z: building.z,
          height: building.height,
          halfWidth: BUILDING_FOOTPRINT / 2,
        },
      );
    }
    return map;
  }, [bounds.buildings]);
  const nearbyDay = useMemo(
    () => days.find((day) => day.date === nearbyDate) ?? null,
    [days, nearbyDate],
  );
  const flightBounds = useMemo<FlightBounds>(
    () => ({
      minX: BUILDING_FOOTPRINT / 2,
      maxX: bounds.cityWidth - CELL_SIZE + BUILDING_FOOTPRINT / 2,
      minZ: BUILDING_FOOTPRINT / 2,
      maxZ: bounds.cityDepth - CELL_SIZE + BUILDING_FOOTPRINT / 2,
      minY: 2.5,
      maxY: MAX_HEIGHT + 80,
    }),
    [bounds.cityDepth, bounds.cityWidth],
  );
  const start = useMemo(
    () =>
      new THREE.Vector3(
        CELL_SIZE * 2.5,
        MIN_HEIGHT * 2.5,
        CELL_SIZE / 2,
      ),
    [],
  );

  const loadNearbyCommits = async () => {
    if (!nearbyDate || source !== "github") {
      return;
    }

    const cached = commitCache.current.get(nearbyDate);
    if (cached) {
      setCommitPanel({
        date: nearbyDate,
        status: "ready",
        commits: cached,
      });
      return;
    }

    setCommitPanel({
      date: nearbyDate,
      status: "loading",
      commits: [],
    });

    try {
      const params = new URLSearchParams({ username: login, date: nearbyDate });
      const response = await fetch(`/api/commits?${params.toString()}`);
      const payload = (await response.json()) as {
        commits?: CommitDetail[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "커밋 내용을 불러오지 못했습니다.");
      }

      const commits = payload.commits ?? [];
      commitCache.current.set(nearbyDate, commits);
      setCommitPanel({ date: nearbyDate, status: "ready", commits });
    } catch (error) {
      setCommitPanel({
        date: nearbyDate,
        status: "error",
        commits: [],
        error:
          error instanceof Error
            ? error.message
            : "커밋 내용을 불러오지 못했습니다.",
      });
    }
  };

  return (
    <>
      <Canvas
        camera={{
          fov: 54,
          near: 0.1,
          far: 3200,
          position: [
            -CELL_SIZE * 3,
            MIN_HEIGHT * 3,
            bounds.cityDepth / 2 + CELL_SIZE,
          ],
        }}
        dpr={[1, 1.75]}
        onPointerDown={() => {
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
        }}
      >
        <color attach="background" args={["#9eb7c9"]} />
        <fog attach="fog" args={["#9eb7c9", 350, 1800]} />
        <hemisphereLight args={["#d7e6f2", "#5c6b52", 0.85]} />
        <directionalLight
          position={[280, 420, 140]}
          intensity={1.15}
          color="#fff4d8"
        />
        <ambientLight intensity={0.22} />
        <City days={days} />
        <PaperPlane
          start={start}
          bounds={flightBounds}
          obstacles={obstacles}
          obstacleCellSize={CELL_SIZE}
          touchControls={touchControls}
          onNearbyDayChange={setNearbyDate}
        />
      </Canvas>
      {nearbyDay ? (
        <aside className="pointer-events-none absolute right-3 top-3 z-30 w-[min(100%-1.5rem,22rem)] sm:right-4 sm:top-4">
          <div className="pointer-events-auto max-h-[60dvh] overflow-y-auto rounded-xl border border-white/15 bg-slate-950/80 p-4 text-slate-100 backdrop-blur-md">
            <p className="text-xs uppercase tracking-[0.16em] text-emerald-300">
              주변 건물
            </p>
            <div className="mt-1 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{nearbyDay.date}</h2>
                <p className="mt-1 text-sm text-slate-300">
                  기여 {nearbyDay.count.toLocaleString("ko-KR")}개
                  {nearbyDay.language ? ` · ${nearbyDay.language}` : ""}
                </p>
              </div>
              <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-xs text-emerald-200">
                가까움
              </span>
            </div>

            {source === "github" ? (
              <button
                className="mt-3 rounded-md bg-emerald-400 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-60"
                type="button"
                disabled={
                  commitPanel?.date === nearbyDay.date &&
                  commitPanel.status === "loading"
                }
                onClick={() => void loadNearbyCommits()}
              >
                {commitPanel?.date === nearbyDay.date &&
                commitPanel.status === "loading"
                  ? "불러오는 중..."
                  : "커밋 내용 보기"}
              </button>
            ) : (
              <p className="mt-3 text-xs text-slate-400">
                데모 도시는 실제 커밋 메시지를 제공하지 않습니다.
              </p>
            )}

            {commitPanel?.date === nearbyDay.date &&
            commitPanel.status === "error" ? (
              <p className="mt-3 text-xs text-rose-300">{commitPanel.error}</p>
            ) : null}

            {commitPanel?.date === nearbyDay.date &&
            commitPanel.status === "ready" ? (
              commitPanel.commits.length > 0 ? (
                <ul className="mt-3 space-y-2 border-t border-white/10 pt-3">
                  {commitPanel.commits.map((commit) => (
                    <li key={commit.sha}>
                      <a
                        className="block rounded-md bg-white/5 p-2 transition hover:bg-white/10"
                        href={commit.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span className="block truncate text-xs font-medium text-slate-100">
                          {commit.message}
                        </span>
                        <span className="mt-1 block truncate text-[11px] text-slate-400">
                          {commit.repository} · {commit.sha.slice(0, 7)}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-slate-400">
                  검색 가능한 공개 커밋 메시지가 없습니다. 해당 건물에는
                  PR·이슈·리뷰 기여가 포함되었을 수 있습니다.
                </p>
              )
            ) : null}
          </div>
        </aside>
      ) : null}
      <TouchControls controls={touchControls} />
    </>
  );
}
