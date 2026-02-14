export type LayoutPreset = 'timeline' | 'ticket' | 'metro' | 'cards';
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
  muted?: string;
  line?: string;
  accent?: string;
  accentDark?: string;
}

export type DesignMotifKind = 'train' | 'nature' | 'beach' | 'city' | 'food' | 'minimal';

export interface DesignMotif {
  kind?: DesignMotifKind;
  heroEmojis?: string[];
}

export interface DesignSpec {
  v: 1;
  layout: DesignLayout;
  palette?: DesignPalette;
  motif?: DesignMotif;
}
