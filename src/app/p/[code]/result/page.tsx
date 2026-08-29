'use client';

// P3 결과 — 순위표 · 사진첩 · 관계 지도 · "우리 모임에서도 열기"
// §10: 참여자 30명 = 잠재 호스트 30명. 유입 채널과 확산 구조가 같은 통로다.

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { ErrorNote, Shell } from '@/components/ui';
import { loadPid } from '@/lib/client';
import { usePoll } from '@/lib/usePoll';
import type { EventRow } from '@/lib/types';

interface ResultState {
  event: EventRow;
  people: { id: string; nickname: string; score: number }[];
  ranking: { rank: number; id: string; nickname: string; score: number }[];
  photos: { id: string; round_no: number; title: string; photo: string }[];
  edges: { a: string; b: string; round_no: number }[];
  reactions: { from_id: string; to_id: string }[];
  stats: {
    rounds: number;
    tasksTotal: number;
    tasksDone: number;
    totalGuesses: number;
    correctGuesses: number;
    reactionCount: number;
  };
}

export default function ResultPage() {
  const code = String(useParams().code ?? '').toUpperCase();
  const { data, error } = usePoll<ResultState>(`/api/events/${code}/result`, 5000);
  const myId = typeof window !== 'undefined' ? loadPid(code) : null;

  if (error) return <Shell><ErrorNote message={error} /></Shell>;
  if (!data) return <Shell><p className="text-muted">불러오는 중…</p></Shell>;

  const { event, people, ranking, photos, edges, reactions, stats } = data;
  const me = ranking.find((r) => r.id === myId);
  const myMet = myId
    ? new Set(edges.filter((e) => e.a === myId || e.b === myId).map((e) => (e.a === myId ? e.b : e.a)))
    : new Set<string>();
  const accuracy = stats.totalGuesses ? Math.round((stats.correctGuesses / stats.totalGuesses) * 100) : 0;

  return (
    <Shell right={<span className="font-mono text-[12px] text-muted">{code}</span>}>
      <div className="rise">
        <p className="kicker mb-2">파티 종료</p>
        <h1 className="mb-1 text-[28px] font-extrabold leading-tight tracking-tight">{event.title}</h1>
        <p className="mb-6 text-[14px] text-muted">
          {stats.rounds}라운드 · {people.length}명 · 미션 {stats.tasksDone}개 완료
        </p>

        {me && (
          <section className="card mb-4 overflow-hidden">
            <div className="bg-gradient-to-br from-violet to-pink px-5 py-6">
              <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-white/70">내 결과</p>
              <p className="mt-1 text-[34px] font-extrabold leading-none text-white">
                {me.rank}위 · {me.score}점
              </p>
              <p className="mt-2 text-[14px] text-white/85">
                오늘 {myMet.size}명을 새로 만났습니다.
              </p>
            </div>
          </section>
        )}

        <section className="card mb-4 p-5">
          <p className="kicker mb-3">순위표</p>
          <div className="grid gap-1.5">
            {ranking.map((r) => (
              <div
                key={r.id}
                className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-[14px] ${
                  r.id === myId ? 'bg-violet/15 font-bold' : ''
                }`}
              >
                <span>
                  <span className="mr-2 inline-block w-5 font-mono text-muted">{r.rank}</span>
                  {r.nickname}
                </span>
                <span className="font-bold">{r.score}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 border-t border-line pt-3 text-[12px] leading-relaxed text-muted">
            점수는 팀이 같이 딴 것이 개인에게 누적된 값입니다. 여러 파트너와 잘 통할수록 높아집니다.
          </p>
        </section>

        <section className="card mb-4 p-5">
          <p className="kicker mb-1">관계 지도</p>
          <p className="mb-4 text-[12px] leading-relaxed text-muted">
            오늘 누가 누구와 앉았는지. 이 기록이 다음 행사에서 &ldquo;아직 안 만난 사람 우선&rdquo;의 재료가
            됩니다.
          </p>
          <RelationMap people={people} edges={edges} me={myId} />
        </section>

        {photos.length > 0 && (
          <section className="card mb-4 p-5">
            <p className="kicker mb-3">오늘의 사진첩</p>
            <div className="grid grid-cols-2 gap-2">
              {photos.map((p) => (
                <figure key={p.id} className="overflow-hidden rounded-xl border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.photo} alt={p.title} className="aspect-square w-full object-cover" />
                  <figcaption className="px-2 py-1.5 text-[11px] text-muted">
                    {p.round_no}R · {p.title}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        <section className="card mb-4 p-5">
          <p className="kicker mb-3">이 행사가 어땠나</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ['미션 완료', `${stats.tasksDone}/${stats.tasksTotal}`],
              ['퀴즈 정답률', `${accuracy}%`],
              ['더 얘기하고 싶다', `${reactions.length}`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-line bg-surface2 px-2 py-3">
                <p className="text-[20px] font-extrabold leading-none">{v}</p>
                <p className="mt-1.5 text-[11px] leading-tight text-muted">{k}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-muted">
            음성 녹음 없이도 &ldquo;이 조합이 잘 통했나&rdquo;는 여기서 잡힙니다. 이 기록이 쌓여 다음
            매칭이 좋아집니다.
          </p>
        </section>

        <Link href="/host/new" className="btn-primary w-full">
          이 파티를 우리 모임에서도 열기
        </Link>
        <p className="mt-3 text-center text-[12px] text-muted">20명 이하는 무료입니다</p>
      </div>
    </Shell>
  );
}

/** 원형 배치 + 만난 사이를 선으로 — 참가자가 많아도 뭉개지지 않는다 */
function RelationMap({
  people,
  edges,
  me,
}: {
  people: { id: string; nickname: string }[];
  edges: { a: string; b: string }[];
  me: string | null;
}) {
  const size = 320;
  const r = size / 2 - 42;

  const pos = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    people.forEach((p, i) => {
      const angle = (i / Math.max(1, people.length)) * Math.PI * 2 - Math.PI / 2;
      m.set(p.id, { x: size / 2 + r * Math.cos(angle), y: size / 2 + r * Math.sin(angle) });
    });
    return m;
  }, [people, r]);

  if (people.length === 0) return <p className="text-[13px] text-muted">참가자가 없습니다.</p>;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full" role="img" aria-label="관계 지도">
      {edges.map((e, i) => {
        const a = pos.get(e.a);
        const b = pos.get(e.b);
        if (!a || !b) return null;
        const mine = me && (e.a === me || e.b === me);
        return (
          <line
            key={i}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={mine ? '#ff5c8a' : '#7b61ff'}
            strokeOpacity={mine ? 0.75 : 0.28}
            strokeWidth={mine ? 1.8 : 1}
          />
        );
      })}
      {people.map((p) => {
        const c = pos.get(p.id)!;
        const isMe = p.id === me;
        return (
          <g key={p.id}>
            <circle cx={c.x} cy={c.y} r={isMe ? 7 : 5} fill={isMe ? '#ff5c8a' : '#7b61ff'} />
            <text
              x={c.x}
              y={c.y - 12}
              textAnchor="middle"
              fill={isMe ? '#ececf6' : '#8b8ba8'}
              fontSize="10"
              fontWeight={isMe ? 700 : 500}
            >
              {p.nickname}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
