"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { VoyageCanvas } from "@/components/scene/VoyageCanvas";
import type { VoyageCalendar } from "@/lib/types";

type LoadState = "idle" | "loading" | "ready" | "error";

export function VoyageApp() {
  const [username, setUsername] = useState("");
  const [calendar, setCalendar] = useState<VoyageCalendar | null>(null);
  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (login?: string) => {
    setState("loading");
    setError(null);
    const query = login
      ? `username=${encodeURIComponent(login)}`
      : "demo=1";

    try {
      const response = await fetch(`/api/contributions?${query}`);
      const payload = (await response.json()) as VoyageCalendar & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "도시를 만들지 못했습니다.");
      }
      setCalendar(payload);
      setState("ready");
    } catch (loadError) {
      setState("error");
      setError(
        loadError instanceof Error
          ? loadError.message
          : "도시를 만들지 못했습니다.",
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const login = username.trim();
    if (!login) {
      void load();
      return;
    }
    void load(login);
  };

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-slate-900 text-slate-100">
      {calendar ? (
        <VoyageCanvas
          key={`${calendar.login}-${calendar.source}-${calendar.from}`}
          days={calendar.days}
        />
      ) : null}

      <aside className="pointer-events-none absolute left-4 top-4 z-10 w-[min(100%-2rem,22rem)]">
        <div className="pointer-events-auto rounded-xl border border-white/15 bg-slate-950/70 p-4 backdrop-blur-md">
          <p className="text-xs uppercase tracking-[0.18em] text-emerald-300/80">
            git-voyage
          </p>
          <h1 className="mt-1 text-lg font-semibold">커밋잔디 위를 활공</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            기여가 많은 날은 더 높고 진한 초록 빌딩이 됩니다. 종이비행기로
            한 해의 도시를 지나갑니다.
          </p>
          <form className="mt-4 flex gap-2" onSubmit={onSubmit}>
            <input
              className="min-w-0 flex-1 rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none ring-emerald-400/40 focus:ring-2"
              placeholder="GitHub username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
            />
            <button
              className="rounded-md bg-emerald-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
              type="submit"
              disabled={state === "loading"}
            >
              {state === "loading" ? "..." : "열기"}
            </button>
          </form>
          <button
            className="mt-2 text-xs text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
            type="button"
            onClick={() => void load()}
          >
            데모 도시로 돌아가기
          </button>
          {error ? (
            <p className="mt-3 text-sm text-rose-300">{error}</p>
          ) : null}
          {calendar ? (
            <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-slate-400">도시</dt>
                <dd>{calendar.name ?? calendar.login}</dd>
              </div>
              <div>
                <dt className="text-slate-400">기여</dt>
                <dd>{calendar.totalContributions.toLocaleString("ko-KR")}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-slate-400">기간</dt>
                <dd>
                  {calendar.from} ~ {calendar.to}
                  {calendar.source === "demo" ? " · 데모" : ""}
                </dd>
              </div>
            </dl>
          ) : null}
        </div>
      </aside>

      <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/10 bg-slate-950/65 px-4 py-2 text-xs text-slate-200 backdrop-blur-md">
        WASD / 방향키로 기울이기 · Shift 가속 · 3인칭 활공
      </div>
    </div>
  );
}
