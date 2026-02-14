import type { Shiori } from '../../domain/entities/Shiori';
import { formatExpiryDateTime, formatRemainingTime } from './shareLink';
import { resolveDesignCssVars } from './shioriDesign/designCssVars';
import { CardsLayout } from './shioriLayouts/CardsLayout';
import { MetroLayout } from './shioriLayouts/MetroLayout';
import { TicketLayout } from './shioriLayouts/TicketLayout';
import { ShioriTimeline } from './ShioriTimeline';

type LayoutMode = 'mobile' | 'desktop';

interface ShioriViewProps {
  data: Shiori;
  expiresAt: number | null;
  layoutMode: LayoutMode;
  locale: string;
}

function resolvePreset(shiori: Shiori): 'timeline' | 'ticket' | 'metro' | 'cards' {
  const preset = shiori.design?.layout?.preset;
  if (preset === 'ticket' || preset === 'metro' || preset === 'cards' || preset === 'timeline') {
    return preset;
  }
  return 'timeline';
}

function resolveDensity(shiori: Shiori): 'compact' | 'comfortable' {
  const density = shiori.design?.layout?.density;
  if (density === 'compact' || density === 'comfortable') {
    return density;
  }
  return 'comfortable';
}

function resolveHeroEmojis(shiori: Shiori): string[] {
  const emojis = shiori.design?.motif?.heroEmojis;
  if (Array.isArray(emojis) && emojis.length > 0) {
    return emojis;
  }
  return ['⛰️', '🚃', '🌲'];
}

export function ShioriView({ data, expiresAt, layoutMode, locale }: ShioriViewProps) {
  const preset = resolvePreset(data);
  const density = resolveDensity(data);
  const heroEmojis = resolveHeroEmojis(data);

  const presetClass = `shiori-layout-${preset}`;
  const densityClass = `shiori-density-${density}`;
  const mobileClass = preset === 'timeline' && layoutMode === 'mobile' ? 'mobile-timeline' : '';
  const cssVars = resolveDesignCssVars(data.design);

  return (
    <article
      className={`panel shiori-view ${presetClass} ${densityClass} ${mobileClass}`.trim()}
      style={cssVars}
      data-testid="shiori-view"
      data-preset={preset}
    >
      <header className="shiori-hero">
        <h1>{data.title}</h1>
        <p className="hero-subtitle">
          {data.destination} / {data.startDateTime} - {data.endDateTime}
        </p>
        {expiresAt !== null ? (
          <p className="subtle-text">
            有効期限: {formatExpiryDateTime(expiresAt, locale)}（{formatRemainingTime(expiresAt)}）
          </p>
        ) : null}
        <div className="hero-deco" aria-hidden>
          {heroEmojis.slice(0, 3).map((emoji, index) => (
            <span key={`${emoji}-${index}`}>{emoji}</span>
          ))}
        </div>
      </header>

      {preset === 'ticket' ? <TicketLayout data={data} /> : null}
      {preset === 'metro' ? <MetroLayout data={data} /> : null}
      {preset === 'cards' ? <CardsLayout data={data} /> : null}
      {preset === 'timeline' ? <ShioriTimeline data={data} /> : null}
    </article>
  );
}

