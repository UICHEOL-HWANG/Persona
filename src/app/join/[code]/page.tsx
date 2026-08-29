'use client';

// P1 프로필 — §7 겹칠 것 · 갈릴 것 · 맞힐 것
// 질문의 역할이 다르다. 이게 무너지면 매칭도 퀴즈도 같이 무너진다.

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Choices, ErrorNote, Shell } from '@/components/ui';
import { fetchJson, loadPid, savePid } from '@/lib/client';
import { MBTI_LIST, QUESTIONS, type QuestionRole } from '@/lib/questions';
import type { Participant } from '@/lib/types';

const ROLE_META: Record<QuestionRole, { title: string; note: string; tone: string }> = {
  overlap: { title: '겹칠 것', note: '대화의 입구를 만드는 질문', tone: 'text-mint' },
  diverge: { title: '갈릴 것', note: '대화가 길어지게 하는 질문', tone: 'text-amber' },
  guess: { title: '맞힐 것', note: '다른 사람이 맞히게 될 퀴즈 재료', tone: 'text-pink' },
};

export default function JoinPage() {
  const code = String(useParams().code ?? '').toUpperCase();
  const router = useRouter();
  const editing = useSearchParams().get('edit') === '1';

  const [pid, setPid] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [mbti, setMbti] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const existing = loadPid(code);
    if (!existing) {
      setReady(true);
      return;
    }
    if (!editing) {
      router.replace(`/p/${code}`);
      return;
    }
    setPid(existing);
    fetchJson<Participant>(`/api/participants/${existing}`)
      .then((p) => {
        setNickname(p.nickname);
        setMbti(p.mbti);
        setAnswers(p.answers ?? {});
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, [code, editing, router]);

  const set = (id: string, v: string) => setAnswers((a) => ({ ...a, [id]: v }));

  const answered = QUESTIONS.filter((q) => (answers[q.id] ?? '').trim()).length;
  const canSubmit = nickname.trim().length > 0 && answered >= 4;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (pid) {
        await fetchJson(`/api/participants/${pid}`, {
          method: 'PATCH',
          body: JSON.stringify({ nickname, mbti, answers }),
        });
      } else {
        const p = await fetchJson<Participant>(`/api/events/${code}/join`, {
          method: 'POST',
          body: JSON.stringify({ nickname, mbti, answers }),
        });
        savePid(code, p.id);
      }
      router.push(`/p/${code}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  if (!ready) return <Shell><p className="text-muted">불러오는 중…</p></Shell>;

  return (
    <Shell right={<span className="font-mono text-[12px] text-muted">{code}</span>}>
      <h1 className="mb-1 text-[26px] font-extrabold tracking-tight">
        {pid ? '프로필 고치기' : '프로필 만들기'}
      </h1>
      <p className="mb-8 text-[14px] leading-relaxed text-muted">
        이 답들이 오늘 누구와 앉을지, 어떤 퀴즈를 받을지를 정합니다. 언제든 고칠 수 있어요.
      </p>

      <ErrorNote message={error} />

      <form onSubmit={submit}>
        <div className="mb-5">
          <label className="label">이름 (닉네임)</label>
          <input
            className="input"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="오늘 불릴 이름"
            maxLength={12}
          />
        </div>

        <div className="mb-8">
          <label className="label">MBTI · 선택</label>
          <div className="grid grid-cols-4 gap-1.5">
            {MBTI_LIST.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMbti(mbti === m ? '' : m)}
                className={`rounded-lg border py-2 font-mono text-[12px] font-bold transition ${
                  mbti === m
                    ? 'border-violet bg-violet/20 text-fg'
                    : 'border-line bg-surface2 text-muted hover:border-muted/60'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-muted">
            MBTI는 겹칠 것과 갈릴 것에 동시에 걸리는 재료라 매칭에 크게 쓰입니다.
          </p>
        </div>

        {(['overlap', 'diverge', 'guess'] as QuestionRole[]).map((role) => (
          <section key={role} className="mb-8">
            <div className="mb-4 flex items-baseline gap-2">
              <h2 className={`text-[15px] font-extrabold ${ROLE_META[role].tone}`}>
                {ROLE_META[role].title}
              </h2>
              <span className="text-[12px] text-muted">{ROLE_META[role].note}</span>
            </div>

            <div className="grid gap-5">
              {QUESTIONS.filter((q) => q.role === role).map((q) => (
                <div key={q.id}>
                  <p className="mb-2 text-[14px] font-semibold">{q.label}</p>
                  {q.options ? (
                    <Choices options={q.options} value={answers[q.id]} onChange={(v) => set(q.id, v)} />
                  ) : (
                    <input
                      className="input"
                      value={answers[q.id] ?? ''}
                      onChange={(e) => set(q.id, e.target.value)}
                      placeholder={q.placeholder}
                      maxLength={60}
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        <div className="sticky bottom-4">
          <button type="submit" className="btn-primary w-full shadow-lg shadow-violet/20" disabled={busy || !canSubmit}>
            {busy ? '보내는 중…' : pid ? '수정 완료' : `참가하기 (${answered}/${QUESTIONS.length} 답함)`}
          </button>
          {!canSubmit && (
            <p className="mt-2 text-center text-[12px] text-muted">
              이름과 최소 4개 질문에 답해 주세요
            </p>
          )}
        </div>
      </form>
    </Shell>
  );
}
