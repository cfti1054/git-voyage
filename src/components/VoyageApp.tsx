"use client";

import { FormEvent, useCallback, useState } from "react";
import { VoyageCanvas } from "@/components/scene/VoyageCanvas";
import type { VoyageCalendar } from "@/lib/types";

type LoadState = "idle" | "loading" | "ready" | "error";
const currentYear = new Date().getFullYear();

export function VoyageApp() {
  const [username, setUsername] = useState("");
  const [fromYear, setFromYear] = useState(currentYear - 5);
  const [toYear, setToYear] = useState(currentYear);
  const [calendar, setCalendar] = useState<VoyageCalendar | null>(null);
  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (login?: string, demo = false) => {
    setState("loading");
    setError(null);
    const params = new URLSearchParams({
      fromYear: String(fromYear),
      toYear: String(toYear),
    });
    if (demo) {
      params.set("demo", "1");
    } else if (login) {
      params.set("username", login);
    }

    try {
      const response = await fetch(`/api/contributions?${params.toString()}`);
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
  }, [fromYear, toYear]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const login = username.trim();
    if (!login) {
      setState("error");
      setError("GitHub 계정명을 입력하세요.");
      return;
    }
    void load(login);
  };

  if (!calendar) {
    return (
      <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-slate-950 px-5 text-slate-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#174333_0%,#0f172a_42%,#020617_100%)]" />
        <section className="relative w-full max-w-lg rounded-2xl border border-white/15 bg-slate-950/75 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <p className="text-xs uppercase tracking-[0.24em] text-emerald-300">
            git-voyage
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            공개 커밋으로 도시를 만드세요
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            보고 싶은 GitHub 계정과 기간을 입력하세요. 공개 기여 잔디가
            연도별 도시로 이어지고, 공개 저장소의 주 언어에 따라 건축
            양식이 달라집니다.
          </p>

          <form className="mt-7 space-y-4" onSubmit={onSubmit}>
            <label className="block">
              <span className="mb-1.5 block text-sm text-slate-300">
                GitHub 계정명
              </span>
              <input
                className="w-full rounded-lg border border-white/10 bg-slate-900/90 px-3 py-2.5 text-sm outline-none ring-emerald-400/40 placeholder:text-slate-500 focus:ring-2"
                placeholder="예: octocat"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                spellCheck={false}
                autoCapitalize="none"
                autoCorrect="off"
                autoFocus
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className="mb-1.5 block text-sm text-slate-300">
                  시작 연도
                </span>
                <input
                  className="w-full rounded-lg border border-white/10 bg-slate-900/90 px-3 py-2.5 text-sm outline-none ring-emerald-400/40 focus:ring-2"
                  type="number"
                  min={2008}
                  max={currentYear}
                  value={fromYear}
                  onChange={(event) => setFromYear(Number(event.target.value))}
                />
              </label>
              <label>
                <span className="mb-1.5 block text-sm text-slate-300">
                  종료 연도
                </span>
                <input
                  className="w-full rounded-lg border border-white/10 bg-slate-900/90 px-3 py-2.5 text-sm outline-none ring-emerald-400/40 focus:ring-2"
                  type="number"
                  min={2008}
                  max={currentYear}
                  value={toYear}
                  onChange={(event) => setToYear(Number(event.target.value))}
                />
              </label>
            </div>
            <p className="text-xs text-slate-500">
              한 번에 최대 10년까지 조회합니다. 비공개 저장소 기여는
              포함되지 않습니다.
            </p>
            <button
              className="w-full rounded-lg bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-60"
              type="submit"
              disabled={state === "loading"}
            >
              {state === "loading"
                ? "도시를 건설하는 중..."
                : "공개 도시 열기"}
            </button>
          </form>
          <button
            className="mt-3 w-full rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-300 transition hover:border-white/20 hover:bg-white/5"
            type="button"
            disabled={state === "loading"}
            onClick={() => void load(undefined, true)}
          >
            데모 도시 둘러보기
          </button>
          {error ? (
            <p className="mt-4 rounded-lg bg-rose-950/60 px-3 py-2 text-sm text-rose-200">
              {error}
            </p>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-slate-900 text-slate-100">
      <VoyageCanvas
        key={`${calendar.login}-${calendar.source}-${calendar.from}`}
        days={calendar.days}
      />

      <aside className="pointer-events-none absolute left-4 top-4 z-10 w-[min(100%-2rem,22rem)]">
        <div className="pointer-events-auto rounded-xl border border-white/15 bg-slate-950/70 p-4 backdrop-blur-md">
          <p className="text-xs uppercase tracking-[0.18em] text-emerald-300/80">
            git-voyage
          </p>
          <h1 className="mt-1 text-lg font-semibold">커밋잔디 위를 활공</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Python은 유럽풍, Java는 조선풍, HTML/CSS는 일본풍 건물이
            됩니다.
          </p>
          <button
            className="mt-3 text-xs text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
            type="button"
            onClick={() => {
              setCalendar(null);
              setState("idle");
              setError(null);
            }}
          >
            다른 계정·기간 선택
          </button>
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
          {calendar.source === "github" &&
          calendar.totalContributions === 0 ? (
            <p className="mt-3 rounded-lg bg-amber-950/70 px-3 py-2 text-xs leading-5 text-amber-200">
              선택한 기간에 API로 확인할 수 있는 공개 기여가 없습니다.
              GitHub에 로그인한 본인 화면의 비공개 잔디와는 다를 수
              있습니다.
            </p>
          ) : null}
        </div>
      </aside>

      <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/10 bg-slate-950/65 px-4 py-2 text-xs text-slate-200 backdrop-blur-md">
        WASD / 방향키로 기울이기 · Shift 가속 · 마우스로 시점 회전 · V 비행기 추적
      </div>
    </div>
  );
}
