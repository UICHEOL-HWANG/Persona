'use client';

// H2 진행 화면 — QR · 참가 현황 · 라운드 시작/종료 · 빠른 모드
// §12: 빠른 모드는 기능 하나 추가가 아니라 데모가 성립하는 조건이다.

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Countdown, ErrorNote, Shell, StoreBanner } from '@/components/ui';
import { fetchJson } from '@/lib/client';
import { usePoll } from '@/lib/usePoll';
import type { EventRow, Task, Team } from '@/lib/types';

interface HostState {
  event: EventRow;
  participants: { id: string; nickname: string; mbti: string; score: number }[];
  teams: Team[];
  tasks: Task[];
  ranking: { rank: number; id: string; nickname: string; score: number }[];
  reactionCount: number;
  meta: { store: string; ai: boolean };
}

export default function HostConsole() {
  const code = String(useParams().code ?? '').toUpperCase();
  const { data, error, refresh } = usePoll<HostState>(`/api/events/${code}`);
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/join/${code}` : '';

  useEffect(() => {
    if (!joinUrl) return;
    void import('qrcode').then((QR) =>
      QR.toDataURL(joinUrl, {
        margin: 1,
        width: 480,
        color: { dark: '#08080e', light: '#ffffff' },
      }).then(setQr),
    );
  }, [joinUrl]);

  const act = async (path: string) => {
    setBusy(true);
    setActionError(null);
    try {
      await fetchJson(`/api/events/${code}/${path}`, { method: 'POST' });
      await refresh();
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (error) return <Shell><ErrorNote message={error} /></Shell>;
  if (!data) return <Shell><p className="text-muted">불러오는 중…</p></Shell>;

  const { event, participants, teams, tasks, ranking, meta } = data;
  const nameOf = (id: string) => participants.find((p) => p.id === id)?.nickname ?? '?';
  const doneCount = tasks.filter((t) => t.done).length;
  const lastRound = event.current_round >= event.total_rounds;

  return (
    <Shell right={<span className="text-[12px] text-muted">호스트 콘솔</span>}>
      <StoreBanner store={meta.store} />
      <ErrorNote message={actionError} />

      <section className="card mb-4 p-5">
        <p className="kicker mb-1">참가 코드</p>
        <p className="font-mono text-[38px] font-extrabold leading-none tracking-[0.2em]">{code}</p>
        <p className="mt-2 text-[14px] font-semibold">{event.title}</p>
        {event.purpose && <p className="mt-1 text-[13px] text-muted">{event.purpose}</p>}

        {qr && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qr}
            alt="참가 QR 코드"
            className="mx-auto mt-4 w-44 rounded-xl border border-line bg-white p-2"
          />
        )}
        <p className="mt-2 break-all text-center text-[11px] text-muted">{joinUrl}</p>
      </section>

      <section className="card mb-4 p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <p className="kicker">참가 현황</p>
          <p className="text-[13px] text-muted">
            {event.team_size === 2 ? '1:1 모드' : `${event.team_size}인 팀`} · {event.rotation_minutes}분 ·{' '}
            {event.total_rounds}라운드
          </p>
        </div>
        <p className="text-[30px] font-extrabold leading-none">
          {participants.length}
          <span className="ml-1 text-[15px] font-semibold text-muted">명</span>
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {participants.map((p) => (
            <span key={p.id} className="chip">
              {p.nickname}
              {p.mbti && <span className="ml-1 text-[11px] text-violet">{p.mbti}</span>}
            </span>
          ))}
          {participants.length === 0 && (
            <p className="text-[13px] text-muted">QR을 띄워 두세요. 참가자가 들어오면 여기 뜹니다.</p>
          )}
        </div>
      </section>

      <section className="card mb-4 p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="kicker">
            {event.status === 'ended'
              ? '종료됨'
              : event.current_round === 0
                ? '시작 전'
                : `${event.current_round} / ${event.total_rounds} 라운드`}
          </p>
          <Countdown startedAt={event.round_started_at} minutes={event.rotation_minutes} />
        </div>

        {event.current_round > 0 && (
          <p className="mb-3 text-[13px] text-muted">
            미션·퀴즈 {doneCount} / {tasks.length} 완료
          </p>
        )}

        {event.status !== 'ended' && (
          <div className="grid gap-2">
            {!lastRound && (
              <button
                className="btn-primary w-full"
                disabled={busy || participants.length < 2}
                onClick={() => act('next')}
              >
                {event.current_round === 0 ? '라운드 시작' : '지금 바로 다음 라운드 ⚡'}
              </button>
            )}
            {participants.length < 2 && (
              <p className="text-center text-[12px] text-muted">참가자가 2명 이상이어야 시작할 수 있습니다</p>
            )}
            <button
              className="btn-ghost w-full"
              disabled={busy}
              onClick={() => act('end')}
            >
              행사 종료하고 결과 보기
            </button>
          </div>
        )}

        {event.status === 'ended' && (
          <Link href={`/p/${code}/result`} className="btn-primary w-full">
            결과 화면 보기
          </Link>
        )}
      </section>

      {teams.length > 0 && (
        <section className="card mb-4 p-5">
          <p className="kicker mb-3">이번 라운드 배치</p>
          <div className="grid gap-2">
            {teams.map((t) => {
              const teamTasks = tasks.filter((x) => x.team_id === t.id);
              const done = teamTasks.filter((x) => x.done).length;
              return (
                <div key={t.id} className="rounded-xl border border-line bg-surface2 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-bold">{t.spot}</span>
                    <span className="text-[12px] text-muted">
                      {done}/{teamTasks.length} · {t.score}점
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] text-muted">
                    {t.member_ids.map(nameOf).join(' · ')}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {ranking.length > 0 && event.current_round > 0 && (
        <section className="card p-5">
          <p className="kicker mb-3">순위표</p>
          <div className="grid gap-1.5">
            {ranking.slice(0, 10).map((r) => (
              <div key={r.id} className="flex items-center justify-between text-[14px]">
                <span>
                  <span className="mr-2 inline-block w-5 font-mono text-muted">{r.rank}</span>
                  {r.nickname}
                </span>
                <span className="font-bold">{r.score}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="mt-6 text-center text-[11px] text-muted">
        미션 생성: {meta.ai ? 'Gemini + 템플릿 폴백' : '템플릿 라이브러리 (GEMINI_API_KEY 미설정)'}
      </p>
    </Shell>
  );
}
