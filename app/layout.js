/* 루트 레이아웃 — 전역 CSS는 기존 파일을 그대로 가져온다 (사본을 만들지 않는다) */
import '../assets/css/app.css';

export const metadata = {
  title: 'Lifetime Recorder — 평생 기록',
  description: '자서전 · 개인 기록 · 가족 기록을 한곳에 모으는 생활밀착형 기록 앱',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
  appleWebApp: { capable: true, title: '평생 기록', statusBarStyle: 'default' }
};

export const viewport = {
  themeColor: '#F4F7F3',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover'
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
