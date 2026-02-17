import { useMemo, useState } from 'react';
import { generatePromptUseCase } from '../../application/usecases/generatePrompt';

const REQUEST_TEMPLATE = `- 行き先: （例: 金沢、富山）
- 開始日時: （例: 2026-03-20T09:00）
- 終了日時: （例: 2026-03-21T18:00）
- 人数・同行者:
- 移動手段:
- 予算:
- 絶対に行きたい場所（必ず全て含まれます）:
- 食事の希望:
- 体験の希望:
- 避けたいこと:
- 補足メモ:`;

export function PromptForm() {
  const [requestText, setRequestText] = useState(REQUEST_TEMPLATE);
  const [copied, setCopied] = useState(false);

  const prompt = useMemo(() => {
    return generatePromptUseCase({
      requestText
    });
  }, [requestText]);

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
      <p>旅行条件欄のテンプレートを埋めるだけで、LLMに渡す厳密JSON指示付きプロンプトを生成します。</p>

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
