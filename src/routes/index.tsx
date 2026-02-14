import { Link, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: HomePage
});

function HomePage() {
  return (
    <section className="panel home-panel">
      <h1>旅行しおりを3ステップで作る</h1>
      <ol className="steps-list">
        <li>
          <strong>ステップ1:</strong> 行き先と日時を入力して、外部LLMに渡すプロンプトを作成
        </li>
        <li>
          <strong>ステップ2:</strong> ChatGPTなどにプロンプトを貼り付けて、しおりデータを作成
        </li>
        <li>
          <strong>ステップ3:</strong> AIの回答を貼り付けて、パスワードを設定し、共有リンクを作成
        </li>
      </ol>

      <div className="action-row">
        <Link className="button primary" to="/prompt">
          プロンプトを作る
        </Link>
        <Link className="button secondary" to="/builder">
          文章からしおり作成
        </Link>
      </div>
    </section>
  );
}
