'use client';

// H1 행사 만들기 — 목적 한 줄 · 인원 · 로테이션 주기 · 팀 인원
// §6: 설정 화면 20개가 아니라 입력창 하나. 목적 한 줄이 미션·퀴즈의 주제와 수위를 정한다.

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Choices, ErrorNote, Field, Shell } from '@/components/ui';
import { fetchJson } from '@/lib/client';
import type { EventRow } from '@/lib/types';

const PURPOSE_PRESETS = [
  '신입생 환영회 · 30명 · 서로 이름도 모름',
  '솔로파티 · 20명 · 연애 목적',
  '게스트하우스 1박 · 12명 · 처음 만난 여행객',
  '사내 워크샵 · 40명 · 부서가 다 다름',
];

const ROTATION_PRESETS = [
  { label: '20분', value: 20, note: '3시간 파티에서 6라운드' },
  { label: '40분', value: 40, note: '이동·사진이 섞일 때' },
  { label: '1분', value: 1, note: '데모·리허설용 빠른 모드' },
];

export default function NewEventPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [hostName, setHostName] = useState('');
  const [teamSize, setTeamSize] = useState(4);
  const [rotation, setRotation] = useState(20);
  const [rounds, setRounds] = useState(4);
  const [photoVerify, setPhotoVerify] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const ev = await fetchJson<EventRow>('/api/events', {
        method: 'POST',
        body: JSON.stringify({
          title,
          purpose,
          host_name: hostName,
          team_size: teamSize,
          rotation_minutes: rotation,
          total_rounds: rounds,
          photo_verify: photoVerify,
        }),
      });
      router.push(`/host/${ev.code}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <Shell>
      <h1 className="mb-1 text-[26px] font-extrabold tracking-tight">행사 만들기</h1>
      <p className="mb-8 text-[14px] text-muted">
        설정은 네 개면 충분합니다. 나머지는 목적 한 줄이 정합니다.
      </p>

      <ErrorNote message={error} />

      <form onSubmit={submit}>
        <Field label="행사 이름">
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="2026 I/O Extended 애프터파티"
            maxLength={40}
          />
        </Field>

        <Field
          label="목적 한 줄"
          hint="이 한 줄이 미션과 퀴즈의 주제·수위를 정합니다. 누가 · 몇 명 · 어떤 사이인지를 쓰세요."
        >
          <textarea
            className="input min-h-[84px] resize-none"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="신입생 환영회 · 30명 · 서로 이름도 모름"
            maxLength={140}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {PURPOSE_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPurpose(p)}
                className={`chip ${purpose === p ? 'chip-on' : 'hover:border-muted/60'}`}
              >
                {p.split(' · ')[0]}
              </button>
            ))}
          </div>
        </Field>

        <Field
          label="팀 인원"
          hint={
            teamSize === 2
              ? '2명 = 1:1 모드. 앉아서 서로를 맞히는 퀴즈가 주 재료가 됩니다 (솔로파티 등).'
              : `${teamSize}명 = 다:다 모드. 움직여서 수행하는 미션이 주 재료가 됩니다.`
          }
        >
          <Choices
            options={['2', '3', '4', '5', '6']}
            value={String(teamSize)}
            onChange={(v) => setTeamSize(Number(v))}
          />
        </Field>

        <Field label="로테이션 주기">
          <div className="grid grid-cols-3 gap-2">
            {ROTATION_PRESETS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRotation(r.value)}
                className={`rounded-xl border px-3 py-3 text-left transition ${
                  rotation === r.value
                    ? 'border-violet bg-violet/15'
                    : 'border-line bg-surface2 hover:border-muted/60'
                }`}
              >
                <span className="block text-[15px] font-bold">{r.label}</span>
                <span className="mt-0.5 block text-[11px] leading-tight text-muted">{r.note}</span>
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={240}
              className="input w-28"
              value={rotation}
              onChange={(e) => setRotation(Number(e.target.value) || 1)}
            />
            <span className="text-[13px] text-muted">분 · 직접 입력</span>
          </div>
        </Field>

        <Field label="라운드 수" hint={`총 ${rotation * rounds}분 진행 예정`}>
          <Choices
            options={['2', '3', '4', '5', '6']}
            value={String(rounds)}
            onChange={(v) => setRounds(Number(v))}
          />
        </Field>

        <button
          type="button"
          onClick={() => setPhotoVerify((v) => !v)}
          className="mb-8 flex w-full items-start gap-3 rounded-xl border border-line bg-surface2 px-4 py-3 text-left"
        >
          <span
            className={`mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition ${
              photoVerify ? 'bg-violet' : 'bg-line'
            }`}
          >
            <span
              className={`h-4 w-4 rounded-full bg-white transition ${photoVerify ? 'translate-x-4' : ''}`}
            />
          </span>
          <span>
            <span className="block text-[14px] font-semibold">사진 인증 필수</span>
            <span className="mt-0.5 block text-[12px] leading-relaxed text-muted">
              기본은 자동 승인입니다. 순위·상품이 걸린 행사에서만 켜세요 — 실제로 미션을 했는데
              인정이 안 되는 게 제일 나쁩니다.
            </span>
          </span>
        </button>

        <button type="submit" className="btn-primary w-full" disabled={busy || !title.trim()}>
          {busy ? '만드는 중…' : '행사 만들기'}
        </button>
      </form>
    </Shell>
  );
}
