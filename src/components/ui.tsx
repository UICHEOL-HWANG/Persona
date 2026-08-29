'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2">
      <span
        className={`inline-block rounded-lg bg-gradient-to-br from-violet to-pink ${
          small ? 'h-5 w-5' : 'h-7 w-7'
        }`}
      />
      <span className={`font-extrabold tracking-tight ${small ? 'text-[15px]' : 'text-xl'}`}>페르소나</span>
    </Link>
  );
}

export function Shell({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="safe-top safe-bottom mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-24">
      <header className="mb-6 flex items-center justify-between">
        <Logo small />
        {right}
      </header>
      {children}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <label className="label">{label}</label>
      {children}
      {hint && <p className="mt-2 text-[12px] leading-relaxed text-muted">{hint}</p>}
    </div>
  );
}

export function Choices({
  options,
  value,
  onChange,
}: {
  options: string[];
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={`chip ${value === o ? 'chip-on' : 'hover:border-muted/60'}`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function ErrorNote({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p className="mb-4 rounded-xl border border-pink/40 bg-pink/10 px-4 py-3 text-[13px] text-pink">
      {message}
    </p>
  );
}

/** 라운드 남은 시간 — 주기가 지나면 호스트에게 "다음 라운드" 신호가 된다 */
export function Countdown({ startedAt, minutes }: { startedAt: string | null; minutes: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!startedAt) return null;

  const endsAt = new Date(startedAt).getTime() + minutes * 60_000;
  const left = Math.max(0, endsAt - now);
  const mm = String(Math.floor(left / 60_000)).padStart(2, '0');
  const ss = String(Math.floor((left % 60_000) / 1000)).padStart(2, '0');
  const over = left === 0;

  return (
    <span
      className={`font-mono text-[15px] font-bold tabular-nums ${over ? 'text-pink' : 'text-fg'}`}
    >
      {over ? '시간 종료' : `${mm}:${ss}`}
    </span>
  );
}

export function StoreBanner({ store }: { store?: string }) {
  if (store !== 'memory') return null;
  return (
    <p className="mb-4 rounded-xl border border-amber/40 bg-amber/10 px-4 py-3 text-[12px] leading-relaxed text-amber">
      지금은 <b>인메모리 모드</b>입니다 — 서버를 재시작하면 데이터가 사라집니다. 배포 전에{' '}
      <code className="font-mono">.env.local</code>에 Supabase 키를 넣어 주세요.
    </p>
  );
}
