"use client";

import type { PointerEvent, RefObject } from "react";
import { useRef, useState } from "react";
import type { FlightControlsState } from "./PaperPlane";

type TouchControlsProps = {
  controls: RefObject<FlightControlsState>;
};

const JOYSTICK_RADIUS = 42;

export function TouchControls({ controls }: TouchControlsProps) {
  const joystick = useRef<HTMLDivElement>(null);
  const viewPointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const [stick, setStick] = useState({ x: 0, y: 0 });

  const updateJoystick = (clientX: number, clientY: number) => {
    const rect = joystick.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    let x = clientX - (rect.left + rect.width / 2);
    let y = clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(x, y);
    if (distance > JOYSTICK_RADIUS) {
      x = (x / distance) * JOYSTICK_RADIUS;
      y = (y / distance) * JOYSTICK_RADIUS;
    }

    setStick({ x, y });
    controls.current.turn = x / JOYSTICK_RADIUS;
    controls.current.climb = -y / JOYSTICK_RADIUS;
  };

  const releaseJoystick = (event: PointerEvent<HTMLDivElement>) => {
    if (joystick.current?.hasPointerCapture(event.pointerId)) {
      joystick.current.releasePointerCapture(event.pointerId);
    }
    setStick({ x: 0, y: 0 });
    controls.current.turn = 0;
    controls.current.climb = 0;
  };

  const startView = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    viewPointer.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
  };

  const moveView = (event: PointerEvent<HTMLDivElement>) => {
    const previous = viewPointer.current;
    if (!previous || previous.id !== event.pointerId) {
      return;
    }
    controls.current.lookDeltaX += event.clientX - previous.x;
    controls.current.lookDeltaY += event.clientY - previous.y;
    viewPointer.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
  };

  const stopView = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    viewPointer.current = null;
  };

  return (
    <div className="touch-controls pointer-events-none absolute inset-0 z-20 select-none">
      <div
        className="pointer-events-auto absolute inset-y-0 right-0 w-1/2 touch-none"
        aria-label="시점 드래그 영역"
        onPointerDown={startView}
        onPointerMove={moveView}
        onPointerUp={stopView}
        onPointerCancel={stopView}
      >
        <span className="absolute bottom-32 right-5 rounded-full bg-slate-950/45 px-2.5 py-1 text-[10px] text-white/70 backdrop-blur-sm">
          드래그하여 시점 회전
        </span>
      </div>

      <div
        ref={joystick}
        className="pointer-events-auto absolute bottom-7 left-6 h-28 w-28 touch-none rounded-full border border-white/25 bg-slate-950/45 shadow-lg backdrop-blur-sm"
        aria-label="비행 조이스틱"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          updateJoystick(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            updateJoystick(event.clientX, event.clientY);
          }
        }}
        onPointerUp={releaseJoystick}
        onPointerCancel={releaseJoystick}
      >
        <span className="absolute left-1/2 top-1 -translate-x-1/2 text-[9px] text-white/60">
          상승
        </span>
        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] text-white/60">
          하강
        </span>
        <div
          className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40 bg-emerald-400/80 shadow-md"
          style={{ transform: `translate(calc(-50% + ${stick.x}px), calc(-50% + ${stick.y}px))` }}
        />
      </div>

      <div className="pointer-events-auto absolute bottom-7 right-5 flex flex-col gap-3">
        <button
          type="button"
          className="h-14 min-w-16 touch-none rounded-full border border-white/25 bg-amber-400/85 px-4 text-xs font-bold text-slate-950 shadow-lg active:scale-95 active:bg-amber-300"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            controls.current.boost = true;
          }}
          onPointerUp={(event) => {
            controls.current.boost = false;
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
          }}
          onPointerCancel={() => {
            controls.current.boost = false;
          }}
        >
          가속
        </button>
        <button
          type="button"
          className="h-14 min-w-16 touch-none rounded-full border border-white/25 bg-slate-950/65 px-4 text-xs font-semibold text-white shadow-lg active:scale-95 active:bg-slate-800"
          onClick={() => {
            controls.current.followRequest += 1;
          }}
        >
          추적
        </button>
      </div>
    </div>
  );
}
