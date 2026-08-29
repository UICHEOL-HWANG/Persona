'use client';

// P2 라운드 화면 — 내 팀 · 만날 장소 · 미션/퀴즈 · 사진 업로드
// 호스트가 다음 라운드를 열면 2초 안에 이 화면이 통째로 갈아끼워진다.

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Countdown, ErrorNote, Shell } from '@/components/ui';
import { fetchJson, loadPid, shrinkImage } from '@/lib/client';
import { usePoll } from '@/lib/usePoll';
import type { EventRow, Participant, Task, Team } from '@/lib/types';

interface MeState {
  event: EventRow;
  me: Participant;
  joinedMidRound: boolean;
  team: Team | null;
  teammates: { id: string; nickname: string }[];
  tasks: (Task & { target_name?: string })[];
  ranking: { rank: number; id: string; nickname: string; score: number }[];
  totalParticipants: number;
}

export default function RoundPage() {
  const code = String(useParams().code ?? '').toUpperCase();
  const router = useRouter();
  const [pid, setPid] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const p = loadPid(code);
    if (!p) router.replace(`/join/${code}`);
    else setPid(p);
    setChecked(true);
  }, [code, router]);

  const { data, error, refresh } = usePoll<MeState>(pid ? `/api/events/${code}/me?pid=${pid}` : null);

  useEffect(() => {
    if (data?.event.status === 'ended') router.replace(`/p/${code}/result`);
  }, [data?.event.status, code, router]);

  if (!checked || (!data && !error)) return <Shell><p className="text-muted">불러오는 중…</p></Shell>;
  if (error) {
    return (
      <Shell>
        <ErrorNote message={error} />
        <Link href={`/join/${code}`} className="btn-ghost w-full">다시 참가하기</Link>
      </Shell>
    );
  }
  if (!data) return null;

  const { event, me, team, teammates, tasks, ranking, totalParticipants, joinedMidRound } = data;

  // ── 대기 화면 ───────────────────────────────────────────
  if (event.current_round === 0 || !team) {
    return (
      <Shell right={<span className="font-mono text-[12px] text-muted">{code}</span>}>
        <div className="rise card p-6 text-center">
          <p className="kicker mb-3">참가 완료</p>
          <p className="text-[22px] font-extrabold">{me.nickname}님, 준비됐습니다</p>
          <p className="mt-3 text-[14px] leading-relaxed text-muted">
            지금 <b className="text-fg">{totalParticipants}명</b>이 들어와 있어요.
            <br />
            호스트가 첫 라운드를 열면 이 화면이 바뀝니다.
          </p>
          <div className="mt-6 flex justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2 w-2 animate-pulse rounded-full bg-violet"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>

        <div className="card mt-4 p-5">
          <p className="kicker mb-2">내 프로필</p>
          <p className="text-[14px]">
            {me.nickname} {me.mbti && <span className="text-violet">· {me.mbti}</span>}
          </p>
          <p className="mt-1 text-[13px] text-muted">
            {Object.values(me.answers ?? {}).filter(Boolean).length}개 질문에 답함
          </p>
          <Link href={`/join/${code}?edit=1`} className="btn-ghost mt-4 w-full">
            프로필 고치기
          </Link>
        </div>
      </Shell>
    );
  }

  // ── 라운드 화면 ─────────────────────────────────────────
  const missions = tasks.filter((t) => t.kind === 'mission');
  const quizzes = tasks.filter((t) => t.kind === 'quiz');

  return (
    <Shell
      right={
        <span className="flex items-center gap-3">
          <span className="text-[12px] text-muted">
            {event.current_round}/{event.total_rounds} 라운드
          </span>
          <Countdown startedAt={event.round_started_at} minutes={event.rotation_minutes} />
        </span>
      }
    >
      <div key={event.current_round} className="rise">
        <section className="card mb-4 overflow-hidden">
          <div className="bg-gradient-to-br from-violet to-pink px-5 py-6 text-center">
            <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-white/70">
              지금 갈 곳
            </p>
            <p className="mt-1 text-[32px] font-extrabold leading-tight text-white">{team.spot}</p>
          </div>
          <div className="px-5 py-4">
            <p className="text-[13px] text-muted">함께할 사람</p>
            <p className="mt-1 text-[18px] font-bold">
              {teammates.map((t) => t.nickname).join(' · ') || '혼자입니다 — 호스트에게 알려 주세요'}
            </p>
          </div>
        </section>

        {/* §3 라운드 도중에 합류한 사람에게는 "어떻게 시작할지"를 한 줄 준다.
            이게 없으면 이미 대화 중인 자리에 끼어드는 게 제일 어렵다. */}
        {joinedMidRound && (
          <section className="card mb-4 border-mint/40 p-5">
            <p className="kicker mb-2 text-mint">진행 중인 라운드에 합류했습니다</p>
            <p className="text-[14px] font-bold">
              {teammates.length > 0
                ? `"${teammates[0].nickname}님, 저 방금 왔어요. 지금 무슨 얘기 중이었어요?"`
                : '"저 방금 왔어요. 같이 해도 될까요?"'}
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-muted">
              이 한 마디로 시작하면 됩니다. 아래 미션·퀴즈는 지금부터 같이 하시면 되고,
              점수는 팀이 함께 딴 것으로 계산됩니다.
            </p>
          </section>
        )}

        {/* §5 매칭 근거 — "왜 이 조합인가"를 그대로 보여준다 */}
        {(team.shared.length > 0 || team.different.length > 0) && (
          <section className="card mb-4 p-5">
            <p className="kicker mb-3">왜 이 조합인가</p>
            {team.shared.map((s) => (
              <p key={s} className="mb-1.5 text-[13px] leading-relaxed">
                <span className="mr-1.5 font-bold text-mint">겹침</span>
                <span className="text-muted">{s}</span>
              </p>
            ))}
            {team.different.map((d) => (
              <p key={d} className="mb-1.5 text-[13px] leading-relaxed">
                <span className="mr-1.5 font-bold text-amber">갈림</span>
                <span className="text-muted">{d}</span>
              </p>
            ))}
            <p className="mt-3 border-t border-line pt-3 text-[12px] leading-relaxed text-muted">
              {/* §3 합류할 때 "어떻게 시작할지"를 앱이 한 줄 안내한다 */}
              {team.shared[0]
                ? `말문이 막히면 ${team.shared[0].split(' · ')[0]} 얘기부터 꺼내세요.`
                : '말문이 막히면 서로 이름의 유래부터 물어보세요.'}
            </p>
          </section>
        )}

        {missions.map((t) => (
          <MissionCard key={t.id} task={t} onDone={refresh} photoRequired={event.photo_verify} />
        ))}

        {quizzes.map((t) => (
          <QuizCard key={t.id} task={t} pid={me.id} onAnswered={refresh} />
        ))}

        {/* §8 되먹임 신호 */}
        {teammates.length > 0 && (
          <section className="card mb-4 p-5">
            <p className="kicker mb-1">라운드가 끝나면</p>
            <p className="mb-3 text-[13px] leading-relaxed text-muted">
              더 얘기하고 싶은 사람을 눌러 주세요. 다음 매칭이 좋아집니다.
            </p>
            <div className="flex flex-wrap gap-2">
              {teammates.map((t) => (
                <WantMore key={t.id} code={code} from={me.id} to={t.id} name={t.nickname} />
              ))}
            </div>
          </section>
        )}

        <section className="card p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <p className="kicker">우리 팀 점수</p>
            <p className="text-[24px] font-extrabold leading-none">{team.score}</p>
          </div>
          <p className="mb-4 text-[12px] leading-relaxed text-muted">
            점수는 팀이 같이 딴 것입니다. 서로를 평가하지 않아요 — 틀려도 상대 탓이 아니라 우리 팀
            점수입니다.
          </p>
          <div className="grid gap-1.5 border-t border-line pt-3">
            {ranking.slice(0, 5).map((r) => (
              <div
                key={r.id}
                className={`flex items-center justify-between text-[13px] ${
                  r.id === me.id ? 'font-bold text-violet' : ''
                }`}
              >
                <span>
                  <span className="mr-2 inline-block w-4 font-mono text-muted">{r.rank}</span>
                  {r.nickname}
                </span>
                <span>{r.score}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Shell>
  );
}

// ── 미션 ────────────────────────────────────────────────────
function MissionCard({
  task,
  onDone,
  photoRequired,
}: {
  task: Task;
  onDone: () => void;
  photoRequired: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const complete = async (photo?: string) => {
    setBusy(true);
    setError(null);
    try {
      await fetchJson(`/api/tasks/${task.id}/complete`, {
        method: 'POST',
        body: JSON.stringify({ photo }),
      });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      await complete(await shrinkImage(file));
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <section className={`card mb-4 p-5 ${task.done ? 'border-mint/40' : ''}`}>
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-md bg-violet/20 px-2 py-0.5 text-[11px] font-bold text-violet">
          미션
        </span>
        {task.source === 'ai' && (
          <span className="rounded-md bg-pink/15 px-2 py-0.5 text-[11px] font-bold text-pink">
            AI 생성
          </span>
        )}
        {task.done && <span className="ml-auto text-[12px] font-bold text-mint">+{task.points}점</span>}
      </div>

      <h3 className="text-[18px] font-extrabold">{task.title}</h3>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">{task.body}</p>

      <ErrorNote message={error} />

      {task.done ? (
        <div className="mt-4">
          {task.photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={task.photo} alt="미션 인증 사진" className="w-full rounded-xl border border-line" />
          )}
          <p className="mt-3 text-center text-[13px] font-bold text-mint">완료했습니다</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onFile}
          />
          <button className="btn-primary w-full" disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? '올리는 중…' : '사진 찍어서 완료하기'}
          </button>
          {!photoRequired && (
            <button className="btn-ghost w-full" disabled={busy} onClick={() => complete()}>
              사진 없이 완료
            </button>
          )}
        </div>
      )}
    </section>
  );
}

// ── 퀴즈 ────────────────────────────────────────────────────
function QuizCard({
  task,
  pid,
  onAnswered,
}: {
  task: Task & { target_name?: string };
  pid: string;
  onAnswered: () => void;
}) {
  const [result, setResult] = useState<{ correct: boolean; answer: string } | null>(null);
  const [myPick, setMyPick] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 서버 응답이 폴링으로 돌아오기 전까지는 방금 고른 값을 그대로 쓴다.
  const mine = task.guesses?.[pid] ?? myPick;
  const isTarget = task.target_id === pid;
  const answered = Boolean(mine) || Boolean(result);

  const guess = async (option: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetchJson<{ correct: boolean; answer: string }>(
        `/api/tasks/${task.id}/guess`,
        { method: 'POST', body: JSON.stringify({ participant_id: pid, guess: option }) },
      );
      setMyPick(option);
      setResult({ correct: res.correct, answer: res.answer });
      onAnswered();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card mb-4 p-5">
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-md bg-pink/20 px-2 py-0.5 text-[11px] font-bold text-pink">퀴즈</span>
        {task.points > 0 && (
          <span className="ml-auto text-[12px] font-bold text-mint">+{task.points}점</span>
        )}
      </div>

      <h3 className="text-[18px] font-extrabold">{task.title}</h3>
      <p className="mt-1 text-[14px] text-muted">{task.body}</p>

      <ErrorNote message={error} />

      {isTarget ? (
        <p className="mt-4 rounded-xl border border-line bg-surface2 px-4 py-3 text-[13px] leading-relaxed text-muted">
          내 문제입니다. 팀원들이 뭘 고르는지 지켜보고, 답이 나오면 왜 그렇게 생각했는지 물어보세요.
        </p>
      ) : (
        <div className="mt-4 grid gap-2">
          {(task.options ?? []).map((o) => {
            const picked = mine === o;
            const isAnswer = Boolean(result) && o === result?.answer;
            return (
              <button
                key={o}
                disabled={busy || answered}
                onClick={() => guess(o)}
                className={`rounded-xl border px-4 py-3 text-left text-[14px] transition disabled:opacity-100 ${
                  isAnswer
                    ? 'border-mint bg-mint/15 font-bold'
                    : picked
                      ? 'border-pink bg-pink/10'
                      : 'border-line bg-surface2 hover:border-violet/60'
                }`}
              >
                {o}
                {isAnswer && <span className="ml-2 text-[12px] text-mint">← 실제 답</span>}
              </button>
            );
          })}
        </div>
      )}

      {result && (
        <p className="mt-4 rounded-xl border border-line bg-surface2 px-4 py-3 text-[13px] leading-relaxed">
          {result.correct ? (
            <>
              <b className="text-mint">맞혔습니다.</b>{' '}
              <span className="text-muted">
                어떻게 알았는지 얘기해 보세요 — 거기서 대화가 이어집니다.
              </span>
            </>
          ) : (
            <>
              <b className="text-amber">틀렸습니다.</b>{' '}
              <span className="text-muted">
                &ldquo;왜 그렇게 생각했어?&rdquo;를 지금 물어보세요. 이게 이 퀴즈의 진짜 목적입니다.
              </span>
            </>
          )}
        </p>
      )}
    </section>
  );
}

// ── 더 얘기하고 싶다 ─────────────────────────────────────────
function WantMore({ code, from, to, name }: { code: string; from: string; to: string; name: string }) {
  const [sent, setSent] = useState(false);
  return (
    <button
      className={`chip ${sent ? 'chip-on' : 'hover:border-muted/60'}`}
      disabled={sent}
      onClick={async () => {
        setSent(true);
        await fetchJson(`/api/events/${code}/react`, {
          method: 'POST',
          body: JSON.stringify({ from_id: from, to_id: to }),
        }).catch(() => setSent(false));
      }}
    >
      {sent ? '✓ ' : '+ '}
      {name}
    </button>
  );
}
