import { useState } from 'react';
import type { Shiori } from '../../../domain/entities/Shiori';
import { generateEditPromptUseCase } from '../../../application/usecases/generateEditPrompt';
import { humanizeValidationError } from './humanizeValidationError';

interface AiEditPanelProps {
  shiori: Shiori;
  onApply: (json: string) => void;
  errors: string[];
}

export function AiEditPanel({ shiori, onApply, errors }: AiEditPanelProps) {
  const [modificationRequest, setModificationRequest] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [pasteJson, setPasteJson] = useState('');
  const [copied, setCopied] = useState(false);

  function handleGeneratePrompt() {
    const prompt = generateEditPromptUseCase({ currentShiori: shiori, modificationRequest });
    setGeneratedPrompt(prompt);
  }

  async function handleCopy() {
    if (!generatedPrompt) return;
    await navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <details className="passphrase-details ai-edit-panel">
      <summary className="passphrase-summary">AI編集（ChatGPT等で修正）</summary>
      <div className="passphrase-inner form-stack">
        <label className="label" htmlFor="ai-modification-request">
          修正内容（任意）
        </label>
        <textarea
          id="ai-modification-request"
          className="textarea"
          rows={3}
          value={modificationRequest}
          onChange={(e) => setModificationRequest(e.target.value)}
          placeholder="例: ランチスポットを追加してください / 2日目をもっと充実させてください"
        />

        <button type="button" className="button secondary" onClick={handleGeneratePrompt}>
          プロンプトを生成
        </button>

        {generatedPrompt ? (
          <>
            <label className="label">生成プロンプト（コピーして外部AIに貼り付け）</label>
            <textarea
              className="textarea"
              rows={8}
              readOnly
              value={generatedPrompt}
            />
            <button type="button" className="button secondary" onClick={handleCopy}>
              {copied ? 'コピーしました！' : 'プロンプトをコピー'}
            </button>
          </>
        ) : null}

        <label className="label" htmlFor="ai-result-json">
          AIが返した修正済みJSON
        </label>
        <textarea
          id="ai-result-json"
          className="textarea"
          rows={6}
          value={pasteJson}
          onChange={(e) => setPasteJson(e.target.value)}
          placeholder="AIが出力したJSONをここに貼り付け"
        />

        {errors.length > 0 ? (
          <ul className="error-list" role="alert">
            {errors.map((e, i) => (
              <li key={i} className="error-message">
                {humanizeValidationError(e)}
              </li>
            ))}
          </ul>
        ) : null}

        <button
          type="button"
          className="button primary"
          disabled={!pasteJson.trim()}
          onClick={() => onApply(pasteJson)}
        >
          修正を適用
        </button>
      </div>
    </details>
  );
}
