export type LayoutMode = 'mobile' | 'desktop';

export function getLayoutMode(width: number): LayoutMode {
  return width < 768 ? 'mobile' : 'desktop';
}
