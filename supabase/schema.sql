-- 페르소나 — Supabase 스키마
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 Run 하면 끝.
-- 컬럼명은 src/lib/types.ts 의 필드명과 1:1로 맞춰져 있다.

create table if not exists events (
  id               text primary key,
  code             text not null unique,
  title            text not null,
  purpose          text not null default '',
  host_name        text not null default '',
  team_size        int  not null default 4,
  rotation_minutes int  not null default 20,
  total_rounds     int  not null default 4,
  status           text not null default 'lobby',   -- lobby | running | ended
  current_round    int  not null default 0,
  round_started_at timestamptz,
  photo_verify     boolean not null default false,  -- §14 기본 꺼짐(자동 승인)
  created_at       timestamptz not null default now()
);

create table if not exists participants (
  id         text primary key,
  event_id   text not null references events(id) on delete cascade,
  nickname   text not null,
  mbti       text not null default '',
  answers    jsonb not null default '{}'::jsonb,
  score      int  not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists participants_event_idx on participants(event_id);

create table if not exists teams (
  id         text primary key,
  event_id   text not null references events(id) on delete cascade,
  round_no   int  not null,
  spot       text not null default '',
  member_ids jsonb not null default '[]'::jsonb,
  score      int  not null default 0,
  shared     jsonb not null default '[]'::jsonb,   -- §5 매칭 근거
  different  jsonb not null default '[]'::jsonb
);
create index if not exists teams_event_round_idx on teams(event_id, round_no);

create table if not exists tasks (
  id           text primary key,
  event_id     text not null references events(id) on delete cascade,
  team_id      text not null,
  round_no     int  not null,
  kind         text not null,                       -- mission | quiz
  title        text not null default '',
  body         text not null default '',
  source       text not null default 'template',    -- ai | template | profile
  target_id    text,
  options      jsonb,
  answer       text,
  guesses      jsonb not null default '{}'::jsonb,
  done         boolean not null default false,
  photo        text,                                -- 축소된 data URL
  completed_at timestamptz,
  points       int not null default 0
);
create index if not exists tasks_event_round_idx on tasks(event_id, round_no);
create index if not exists tasks_team_idx on tasks(team_id);

-- §5 "아직 안 만난 사람 우선" + §12 관계 지도의 원본
create table if not exists meetings (
  event_id text not null references events(id) on delete cascade,
  a        text not null,
  b        text not null,
  round_no int  not null,
  primary key (event_id, a, b, round_no)
);

-- §8 되먹임 신호 — "더 얘기하고 싶다"
create table if not exists reactions (
  event_id text not null references events(id) on delete cascade,
  round_no int  not null,
  from_id  text not null,
  to_id    text not null,
  primary key (event_id, round_no, from_id, to_id)
);

-- 서버(라우트 핸들러)에서만 접근하므로 RLS는 켜고 정책은 두지 않는다.
-- SUPABASE_SERVICE_ROLE_KEY 는 RLS를 우회하며, 이 키는 클라이언트로 나가지 않는다.
alter table events       enable row level security;
alter table participants enable row level security;
alter table teams        enable row level security;
alter table tasks        enable row level security;
alter table meetings     enable row level security;
alter table reactions    enable row level security;
