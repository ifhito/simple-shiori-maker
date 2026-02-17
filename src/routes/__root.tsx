/// <reference types="vite/client" />

import { HeadContent, Link, Outlet, Scripts, createRootRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import appCss from '../styles.css?url';

function RootLayout() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Link className="brand" to="/">
            旅のしおりメーカー
          </Link>
          <nav className="topnav">
            <Link className="topnav-link" to="/">
              使い方
            </Link>
            <Link className="topnav-link" to="/prompt">
              プロンプト生成
            </Link>
            <Link className="topnav-link" to="/builder">
              文章から作成
            </Link>
            <Link className="topnav-link" to="/links">
              マイリンク
            </Link>
          </nav>
        </div>
      </header>
      <main className="main-container">
        <Outlet />
      </main>
    </div>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

export const Route = createRootRoute({
  head: () => ({
    title: '旅行しおりメーカー',
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      {
        name: 'description',
        content: '旅行プランをプロンプト生成して、暗号化URLで共有できるしおりアプリ'
      }
    ],
    links: [{ rel: 'stylesheet', href: appCss }]
  }),
  shellComponent: RootDocument,
  component: RootLayout
});
