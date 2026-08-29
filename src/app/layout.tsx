import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '페르소나 — 파티가 굴러가게 만드는 도구',
  description:
    '참여자를 취향·MBTI로 매칭하고, 주기마다 로테이션시키고, 그때그때 미션과 퀴즈를 던져 자연스럽게 친해지게 만드는 오프라인 행사 도구.',
};

export const viewport: Viewport = {
  themeColor: '#08080e',
  width: 'device-width',
  initialScale: 1,
  // 확대를 막지 않는다 — 노치 대응(viewportFit)만 켠다.
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
