# 페르소나

> 파티에서 소외되는 건 성격 탓이 아니라 형식 탓이다.

행사 주최자가 도입하는 B2B 도구. 참여자를 취향·MBTI로 **매칭**하고, 주기마다 **로테이션**시키고,
그때그때 **미션과 퀴즈**를 던져 자연스럽게 친해지게 만든다.

기획 원본은 [CLAUDE.md](CLAUDE.md). 이 문서는 **돌리는 법**만 다룬다.

---

## 빠른 시작

```bash
npm install
npm run dev
```

`.env.local` 없이도 그대로 뜬다 — **인메모리 모드**로 붙어서 전체 플로우가 완주된다.
(서버를 재시작하면 데이터는 사라진다.)

데모용 행사와 가짜 참가자를 한 번에 넣으려면:

```bash
node scripts/seed.mjs 12
```

행사 코드·호스트 콘솔 주소·참가자 링크를 출력한다.

전 구간 자동 점검(매칭·로테이션·점수·재매칭 회피까지):

```bash
node scripts/seed.mjs 8 --smoke
```

---

## 화면 다섯 개

| | 경로 | 하는 일 |
|---|---|---|
| **H1** | `/host/new` | 행사 만들기 — 목적 한 줄 · 팀 인원 · 로테이션 주기 · 라운드 수 |
| **H2** | `/host/[code]` | 진행 화면 — QR · 참가 현황 · 라운드 시작/종료 · **빠른 모드** |
| **P1** | `/join/[code]` | 프로필 — 겹칠 것 · 갈릴 것 · 맞힐 것 (10문항, 언제든 수정) |
| **P2** | `/p/[code]` | 라운드 — 내 팀 · 만날 장소 · 매칭 근거 · 미션/퀴즈 · 사진 업로드 |
| **P3** | `/p/[code]/result` | 결과 — 순위표 · 관계 지도 · 사진첩 · "우리 모임에서도 열기" |

### 데모 순서

1. `/host/new` 에서 행사를 만든다. **로테이션 주기는 `1분`을 고른다.**
2. 나온 QR을 참가자들이 찍는다 (`/join/[code]`).
3. 호스트 화면에서 **라운드 시작**.
4. 참가자 폰이 **새로고침 없이** 팀·장소·미션으로 갈아탄다.
5. 퀴즈를 하나 틀려 본다 — 정답이 공개되면서 "왜 그렇게 생각했어?"가 뜬다.
6. 호스트 화면에서 **지금 바로 다음 라운드 ⚡**. 20분을 기다리지 않고 로테이션을 보여준다.
7. **행사 종료** → 결과 화면.

---

## 외부 서비스 연결

로컬 개발에는 아무것도 필요 없다. **배포할 때만** 아래 둘을 붙인다.

### 1. Supabase — 배포에 필수

인메모리 모드는 서버리스(Vercel)에서 못 쓴다. 요청마다 다른 인스턴스로 갈 수 있어
방금 만든 행사가 다음 요청에서 사라진다.

1. [supabase.com](https://supabase.com) 에서 프로젝트를 만든다.
2. 대시보드 > **SQL Editor** 에 [`supabase/schema.sql`](supabase/schema.sql) 을 통째로 붙여넣고 Run.
3. **Project Settings > Data API** 에서 Project URL,
   **Project Settings > API Keys** 에서 `service_role` 키를 복사한다.
   (예전 대시보드라면 **Settings > API** 한 곳에 둘 다 있다.)
4. `.env.local` (로컬) 과 Vercel 환경변수에 넣는다:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

> `service_role` 키는 RLS를 우회한다. 서버(라우트 핸들러)에서만 쓰이고 브라우저로 나가지
> 않으므로 `NEXT_PUBLIC_` 접두사를 붙이지 말 것.

### 2. Gemini — 선택

없어도 된다. 미션이 템플릿 라이브러리에서 나올 뿐, 퀴즈는 원래 LLM을 쓰지 않아서
전체 플로우가 그대로 완주된다.

1. [aistudio.google.com/apikey](https://aistudio.google.com/apikey) 에서 키를 발급한다.
2. `GEMINI_API_KEY=...` 를 넣는다.

키가 붙으면 호스트가 쓴 **목적 한 줄**과 그 팀의 실제 공통점·차이점을 넣어 미션을 생성하고,
미션 카드에 `AI 생성` 배지가 붙는다. 호출이 실패하면 조용히 템플릿으로 넘어간다.

### 3. Vercel — 배포

```bash
npx vercel
npx vercel --prod
```

또는 GitHub에 push한 뒤 [vercel.com/new](https://vercel.com/new) 에서 저장소를 임포트한다.
어느 쪽이든 **Settings > Environment Variables 에 위 키들을 먼저 넣어야** 한다.

---

## 설계에서 알아 둘 것

**실시간을 폴링으로 한다.** 로테이션은 분 단위라 2초 폴링으로 충분하고, 저장소 백엔드가
Supabase든 인메모리든 똑같이 동작한다. 참가자 화면은 `/api/events/[code]/me` 를,
호스트 화면은 `/api/events/[code]` 를 2초마다 당긴다. 탭이 백그라운드면 쉬었다가
돌아올 때 즉시 한 번 당긴다.

**사진은 클라이언트에서 줄여 data URL로 저장한다.** 긴 변 900px · JPEG 0.72로 줄이면
별도 스토리지 설정 없이 한 컬럼에 들어가고 현장 3G에서도 올라간다.

**매칭 규칙은 한 문장이다** ([`src/lib/matching.ts`](src/lib/matching.ts)).
겹치는 게 하나는 있고 갈리는 게 하나는 있는 조합을 우선하고, 아직 안 만난 사람을 앞세운다.
그리디로 팀을 짠 뒤 2-opt 교환으로 다듬는다 — 이게 없으면 마지막 두 명이
"이미 만난 사이"만 남는 코너에 몰린다.

**퀴즈에는 LLM을 쓰지 않는다** ([`src/lib/round.ts`](src/lib/round.ts)).
참가자가 낸 프로필이 그대로 재료다. 그래서 키가 없어도, 네트워크가 죽어도 퀴즈는 나온다.

**점수는 팀이 같이 딴다.** 라운드 점수를 팀 단위로 주고, 그게 팀원 전원의 개인 점수에
누적되어 순위표가 된다. 서로를 평가하는 구조가 남으면 무슨 말을 붙여도 소개팅으로 읽힌다.

---

## 아직 안 만든 것 (로드맵)

기획서 §12의 "다음 단계"와 같다. 본문 화면 다섯 개는 전부 동작한다.

- 행사 탐색·예매·예매 내역 — 앱의 플랫폼 면
- 푸시 알림 — 지금은 화면 갱신으로 대체
- 현장 스크린 연동
- 본인인증 · 신고 처리
- 라운드 중 이탈 시 **자동 재매칭** — 지금은 자투리 인원을 팀에 합류시키는 것까지만
- 사진 미션의 AI 판별 — §14 판단대로 기본은 자동 승인. `photo_verify` 옵션은 "사진 필수"까지만 구현

## 구조

```
src/
  app/
    page.tsx                    랜딩
    host/new · host/[code]      H1 · H2
    join/[code]                 P1
    p/[code] · p/[code]/result  P2 · P3
    api/                        라우트 핸들러 (전부 무캐시)
  lib/
    matching.ts                 §5 매칭 — 점수 함수와 2-opt
    round.ts                    라운드 열기: 매칭 → 미션·퀴즈 → 만남 기록
    questions.ts                §7 프로필 질문 10개
    mission/gemini.ts           AI 생성 (실패 시 null)
    mission/templates.ts        템플릿 라이브러리
    store/                      Supabase ↔ 인메모리 공통 인터페이스
supabase/schema.sql             Supabase에 붙여넣을 스키마
scripts/seed.mjs                데모 시드 + 전 구간 점검
```
