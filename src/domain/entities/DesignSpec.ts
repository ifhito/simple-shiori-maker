export type LayoutPreset = 'timeline' | 'ticket' | 'metro' | 'cards' | 'serpentine';
export type LayoutDensity = 'compact' | 'comfortable';

export interface DesignLayout {
  preset: LayoutPreset;
  density?: LayoutDensity;
  cornerRadius?: number;
  showDaySeparators?: boolean;
}

export interface DesignPalette {
  bg?: string;
  panel?: string;
  text?: string;
  /** 補助テキスト・非アクティブ要素に使う控えめな色（例: 日時・場所ラベルなどのサブテキスト） */
  muted?: string;
  line?: string;
  accent?: string;
  accentDark?: string;
}

export type DesignMotifKind = string;

export interface DesignMotif {
  kind?: DesignMotifKind;
}

export interface DesignSpec {
  v: 1;
  layout: DesignLayout;
  palette?: DesignPalette;
  motif?: DesignMotif;
}
