import { useMemo, useState } from 'react';
import { generatePromptUseCase } from '../../application/usecases/generatePrompt';

const BASIC_INFO_TEMPLATE = `- 行き先:
- 開始日時:（例: 2026-03-20T09:00）
- 終了日時:（例: 2026-03-21T18:00）
- 人数・同行者:`;

export function PromptForm() {
  const [basicInfo, setBasicInfo] = useState(BASIC_INFO_TEMPLATE);
  const [tripStyle, setTripStyle] = useState('');
  const [mustVisit, setMustVisit] = useState('');
  const [designRequest, setDesignRequest] = useState('');
  const [copied, setCopied] = useState(false);

  const prompt = useMemo(() => {
    return generatePromptUseCase({ basicInfo, tripStyle, mustVisit, designRequest });
  }, [basicInfo, tripStyle, mustVisit, designRequest]);

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
      <p>各欄を入力すると、AIに貼り付けるプロンプトが自動生成されます。</p>

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
              <code>metro</code>（路線図風）/ <code>cards</code>（カード風）/
              <code>serpentine</code>（蛇行道路風）
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
          </ul>

          <pre className="prompt-example-text">{`"design": {
  "v": 1,
  "layout": { "preset": "metro", "density": "comfortable", "cornerRadius": 24 },
  "palette": { "bg": "#f6f4f0", "panel": "#ffffff", "accent": "#2b6cb0" }
}`}</pre>

          <p className="subtle-text">
            補足: <code>typography</code> や <code>pathStyle</code> などの追加フィールドを書いても、現時点では表示に反映されません。
          </p>
        </div>
      </details>

      <label className="label" htmlFor="basic-info">
        行き先・日時・人数（必須）
      </label>
      <textarea
        id="basic-info"
        className="textarea"
        rows={5}
        value={basicInfo}
        onChange={(event) => setBasicInfo(event.target.value)}
        placeholder="テンプレートをベースに記入してください"
      />

      <label className="label" htmlFor="trip-style">
        どのような旅行にしたいか（必須）
      </label>
      <textarea
        id="trip-style"
        className="textarea"
        rows={4}
        value={tripStyle}
        onChange={(event) => setTripStyle(event.target.value)}
        placeholder="例: 温泉メインでのんびり／グルメ重視で食べ歩き／子連れで無理なくまわる"
      />

      <label className="label" htmlFor="must-visit">
        絶対行きたい場所（任意・入力した場所は必ず含まれます）
      </label>
      <textarea
        id="must-visit"
        className="textarea"
        rows={3}
        value={mustVisit}
        onChange={(event) => setMustVisit(event.target.value)}
        placeholder="例: 箱根美術館、大涌谷、強羅公園"
      />

      <label className="label" htmlFor="design-request">
        デザイン希望（任意）
      </label>
      <input
        id="design-request"
        className="input"
        type="text"
        value={designRequest}
        onChange={(event) => setDesignRequest(event.target.value)}
        placeholder="例: 黄色で電車みたい／レトロ喫茶風／北欧ミニマル"
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
        placeholder="行き先・日時・人数とどのような旅行にしたいかを入力するとプロンプトが表示されます"
      />

      <button className="button primary" type="button" onClick={copyPrompt} disabled={!prompt}>
        {copied ? 'コピーしました' : 'プロンプトをコピー'}
      </button>
    </section>
  );
}
