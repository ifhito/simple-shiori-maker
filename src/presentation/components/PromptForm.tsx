import { useMemo, useState } from 'react';
import { generatePromptUseCase } from '../../application/usecases/generatePrompt';

type PromptFieldKey =
  | 'destination'
  | 'startDateTime'
  | 'endDateTime'
  | 'people'
  | 'transport'
  | 'budget'
  | 'mustVisit';

interface FieldConfig {
  key: PromptFieldKey;
  label: string;
  assemblyLabel: string;
  inputType: 'text' | 'textarea';
  placeholder?: string;
}

const FIELD_CONFIG: FieldConfig[] = [
  { key: 'destination', label: '行き先', assemblyLabel: '行き先', inputType: 'text', placeholder: '例: 金沢、富山' },
  { key: 'startDateTime', label: '開始日時', assemblyLabel: '開始日時', inputType: 'text', placeholder: '例: 2026-03-20T09:00' },
  { key: 'endDateTime', label: '終了日時', assemblyLabel: '終了日時', inputType: 'text', placeholder: '例: 2026-03-21T18:00' },
  { key: 'people', label: '人数・同行者', assemblyLabel: '人数・同行者', inputType: 'text' },
  { key: 'transport', label: '移動手段', assemblyLabel: '移動手段', inputType: 'text' },
  { key: 'budget', label: '予算', assemblyLabel: '予算', inputType: 'text' },
  { key: 'mustVisit', label: '行きたい場所・食事・体験（必ず全て含まれます）', assemblyLabel: '行きたい場所・食事・体験（必ず全て含まれます）', inputType: 'textarea' },
];

const EMPTY_FIELDS: Record<PromptFieldKey, string> = Object.fromEntries(
  FIELD_CONFIG.map(({ key }) => [key, ''])
) as Record<PromptFieldKey, string>;

function assembleRequestText(fields: Record<PromptFieldKey, string>): string {
  return FIELD_CONFIG
    .filter(({ key }) => fields[key].trim() !== '')
    .map(({ key, assemblyLabel }) => `- ${assemblyLabel}: ${fields[key].trim()}`)
    .join('\n');
}

export function PromptForm() {
  const [fields, setFields] = useState<Record<PromptFieldKey, string>>(EMPTY_FIELDS);
  const [copied, setCopied] = useState(false);

  function updateField(key: PromptFieldKey, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  const prompt = useMemo(() => {
    const requestText = assembleRequestText(fields);
    return generatePromptUseCase({ requestText });
  }, [fields]);

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
      <p>各項目を入力すると、LLMに渡す厳密JSON指示付きプロンプトが生成されます。全項目は任意です。</p>

      {FIELD_CONFIG.map(({ key, label, inputType, placeholder }) => (
        <div key={key}>
          <label className="label" htmlFor={`field-${key}`}>{label}</label>
          {inputType === 'textarea' ? (
            <textarea
              id={`field-${key}`}
              className="textarea"
              rows={3}
              value={fields[key]}
              onChange={(e) => updateField(key, e.target.value)}
              placeholder={placeholder}
            />
          ) : (
            <input
              id={`field-${key}`}
              className="input"
              type="text"
              value={fields[key]}
              onChange={(e) => updateField(key, e.target.value)}
              placeholder={placeholder}
            />
          )}
        </div>
      ))}

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
