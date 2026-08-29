'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Logo } from '@/components/ui';

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState('');

  const enter = (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (c.length >= 4) router.push(`/join/${c}`);
  };

  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pb-10">
      <header className="mb-14 flex items-center justify-between">
        <Logo />
        <Link href="/host/new" className="text-[13px] font-semibold text-muted hover:text-fg">
          호스트로 시작 →
        </Link>
      </header>

      <div className="rise">
        <p className="kicker mb-3">오프라인 행사 진행 도구</p>
        <h1 className="text-[34px] font-extrabold leading-[1.2] tracking-tight">
          파티에서 소외되는 건
          <br />
          성격 탓이 아니라
          <br />
          <span className="bg-gradient-to-r from-violet to-pink bg-clip-text text-transparent">
            형식 탓이다.
          </span>
        </h1>
        <p className="mt-5 text-[15px] leading-relaxed text-muted">
          8명이 넘으면 대화가 쪼개지고, 누군가는 어느 쪽에도 못 낍니다. 페르소나는 참여자를
          취향·MBTI로 <b className="text-fg">매칭</b>하고, 주기마다{' '}
          <b className="text-fg">로테이션</b>시키고, 그때그때{' '}
          <b className="text-fg">미션과 퀴즈</b>를 던져 자리가 굴러가게 만듭니다.
        </p>
      </div>

      <form onSubmit={enter} className="card mt-10 p-5">
        <label className="label">참가 코드</label>
        <div className="flex gap-2">
          <input
            className="input flex-1 text-center font-mono text-[22px] font-bold tracking-[0.35em]"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="ABC123"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
          />
        </div>
        <button type="submit" className="btn-primary mt-3 w-full" disabled={code.trim().length < 4}>
          참가하기
        </button>
        <p className="mt-3 text-center text-[12px] text-muted">
          호스트 화면의 QR을 찍거나 코드를 입력하세요
        </p>
      </form>

      <div className="mt-10 grid gap-3">
        {[
          ['① 프로필', '겹칠 것 · 갈릴 것 · 맞힐 것 — 역할이 다른 질문 10개'],
          ['② 매칭', '겹치는 게 하나는 있고, 갈리는 게 하나는 있는 조합을 우선'],
          ['③ 라운드', '미션과 퀴즈. 팀 점수로 같이 딴다 — 서로를 평가하지 않는다'],
          ['④ 결과', '순위표 · 사진첩 · 관계 지도'],
        ].map(([t, d]) => (
          <div key={t} className="card px-4 py-3.5">
            <p className="text-[14px] font-bold">{t}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">{d}</p>
          </div>
        ))}
      </div>

      <Link href="/host/new" className="btn-ghost mt-10 w-full">
        행사 만들기
      </Link>
    </main>
  );
}
