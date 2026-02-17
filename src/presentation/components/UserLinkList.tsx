import { useMemo, useState } from 'react';
import type { UserLinkEntry } from '../../domain/entities/UserLinkList';
import { buildShareUrl, formatExpiryDateTime, formatRemainingTime } from './shareLink';

interface UserLinkListProps {
  links: UserLinkEntry[];
  onDelete: (key: string) => void;
  onLogout: () => void;
}

export function UserLinkList({ links, onDelete, onLogout }: UserLinkListProps) {
  const [search, setSearch] = useState('');
  const locale = typeof navigator === 'undefined' ? 'ja-JP' : navigator.language;
  const origin = typeof window === 'undefined' ? '' : window.location.origin;

  const filtered = useMemo(() => {
    if (!search.trim()) {
      return links;
    }
    const query = search.toLowerCase();
    return links.filter(
      (link) =>
        link.title.toLowerCase().includes(query) ||
        link.destination.toLowerCase().includes(query)
    );
  }, [links, search]);

  const now = Date.now();

  return (
    <section className="links-layout">
      <div className="links-header">
        <h2>リンク一覧（{links.length}件）</h2>
        <button className="button secondary" type="button" onClick={onLogout}>
          ログアウト
        </button>
      </div>

      {links.length > 0 ? (
        <input
          className="input search-input"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="タイトル・目的地で検索"
        />
      ) : null}

      {filtered.length === 0 ? (
        <p className="subtle-text">
          {links.length === 0
            ? 'まだリンクがありません（合言葉が違う場合も0件として表示されます）。「文章から作成」で合言葉を設定すると、ここに表示されます。'
            : '検索条件に一致するリンクがありません。'}
        </p>
      ) : (
        <div className="link-card-list">
          {filtered.map((link) => {
            const expired = link.expiresAt <= now;
            const url = buildShareUrl(origin, link.key);

            return (
              <div key={link.key} className={`link-card${expired ? ' link-expired' : ''}`}>
                <div className="link-card-body">
                  <h3 className="link-card-title">{link.title}</h3>
                  <p className="subtle-text">{link.destination}</p>
                  <p className="subtle-text">
                    作成: {formatExpiryDateTime(link.createdAt, locale)}
                  </p>
                  <p className={`subtle-text${expired ? ' link-expired-text' : ''}`}>
                    {expired
                      ? '期限切れ'
                      : `有効期限: ${formatExpiryDateTime(link.expiresAt, locale)}（${formatRemainingTime(link.expiresAt)}）`}
                  </p>
                  {!expired ? (
                    <a className="share-link" href={url}>
                      {url}
                    </a>
                  ) : null}
                </div>
                <button
                  className="button delete-button"
                  type="button"
                  onClick={() => onDelete(link.key)}
                  aria-label={`${link.title} を削除`}
                >
                  削除
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
