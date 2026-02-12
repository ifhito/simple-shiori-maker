import { Link, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/shiori')({
  component: LegacyShioriRoutePage
});

function LegacyShioriRoutePage() {
  return (
    <section className="panel form-stack">
      <h2>共有リンクの形式が更新されました</h2>
      <p>このURL形式は現在サポートしていません。新しい共有リンク（`/s/...`）を使用してください。</p>
      <Link className="button secondary inline-block" to="/builder">
        しおりを再生成する
      </Link>
    </section>
  );
}
