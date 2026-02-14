import { useMemo, useState } from 'react';
import { generatePromptUseCase } from '../../application/usecases/generatePrompt';

const REQUEST_TEMPLATE = `- 行き先: （例: 金沢、富山）
- 開始日時: （例: 2026-03-20T09:00）
- 終了日時: （例: 2026-03-21T18:00）
- 人数・同行者:
- 移動手段:
- 予算:
- デザイン希望: （例: 黄色で電車みたい / レトロ喫茶風 / 北欧ミニマル）
- 絶対に行きたい場所:
- 食事の希望:
- 体験の希望:
- 避けたいこと:
- 補足メモ:`;

export function PromptForm() {
  const [requestText, setRequestText] = useState(REQUEST_TEMPLATE);
  const [designReferenceImage, setDesignReferenceImage] = useState(false);
  const [copied, setCopied] = useState(false);

  const prompt = useMemo(() => {
    return generatePromptUseCase({
      requestText,
      designReferenceImage
    });
  }, [requestText, designReferenceImage]);

  async function copyPrompt() {
    if (!prompt || typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="panel form-stack">
      <h1>プロンプト生成</h1>
      <p>
        旅行条件欄のテンプレートを埋めるだけで、AIに貼り付ける文章（プロンプト）を生成します。返ってきた回答は、そのまま
        <code> /builder</code> に貼り付けOKです。
      </p>

      <details className="passphrase-details">
        <summary className="passphrase-summary">デザイン（任意）の指定方法</summary>
        <div className="form-stack passphrase-inner">
          <p className="subtle-text">
            AIが返す「しおりデータ」に <code>design</code> を含めると、共有ページ（<code>/s/&lt;key&gt;</code>）の見た目を変更できます。
            現時点で反映されるのは以下のみです。
          </p>
          <ul className="steps-list">
            <li>
              <strong>layout.preset:</strong> <code>timeline</code>（標準）/ <code>ticket</code>（切符風）/
              <code>metro</code>（路線図風）/ <code>cards</code>（カード風）
            </li>
            <li>
              <strong>layout.density:</strong> <code>compact</code> / <code>comfortable</code>
            </li>
            <li>
              <strong>layout.cornerRadius:</strong> 角丸（0〜28）
            </li>
            <li>
              <strong>palette:</strong> 色指定（hexカラー。<code>bg</code>/<code>panel</code>/<code>text</code>/<code>accent</code> など）
            </li>
            <li>
              <strong>motif.heroEmojis:</strong> ヘッダーの絵文字（最大3つ）
            </li>
          </ul>

          <pre className="prompt-example-text">{`"design": {
  "v": 1,
  "layout": { "preset": "metro", "density": "comfortable", "cornerRadius": 24 },
  "palette": { "bg": "#f6f4f0", "panel": "#ffffff", "accent": "#2b6cb0" },
  "motif": { "heroEmojis": ["🌀", "🚄", "🍣"] }
}`}</pre>

          <p className="subtle-text">
            補足: 時刻表示の位置や線の形などの構造変更は、いまは <code>preset</code> 固定です。
            <code>typography</code> や <code>pathStyle</code> などの追加フィールドを書いても、現時点では表示に反映されません。
          </p>
        </div>
      </details>

      <label className="label" htmlFor="request-text">
        旅行条件メモ（テンプレート付き）
      </label>
      <textarea
        id="request-text"
        className="textarea"
        rows={14}
        value={requestText}
        onChange={(event) => setRequestText(event.target.value)}
        placeholder="テンプレートをベースに旅行条件を記述"
      />

      <label className="label">
        <input
          type="checkbox"
          checked={designReferenceImage}
          onChange={(event) => setDesignReferenceImage(event.target.checked)}
        />{' '}
        デザイン参照画像をLLMに添付している（プロンプトに明記する）
      </label>

      <label className="label" htmlFor="prompt-output">
        生成プロンプト
      </label>
      <textarea
        id="prompt-output"
        className="textarea"
        rows={14}
        readOnly
        value={prompt}
        placeholder="旅行条件欄を入力するとここにプロンプトが表示されます"
      />

      <button className="button primary" type="button" onClick={copyPrompt} disabled={!prompt}>
        {copied ? 'コピーしました' : 'プロンプトをコピー'}
      </button>
    </section>
  );
}
