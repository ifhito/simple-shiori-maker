import type { Shiori, ShioriDay, ShioriItem } from '../../../domain/entities/Shiori';
import { resolveMapUrl } from './mapLink';

const ITEM_H = 160; // px per stop (also SVG y-unit)
const DAY_H = 52;   // px per day-header row
const LEFT_X = 35;  // SVG x% for left-side nodes
const RIGHT_X = 65; // SVG x% for right-side nodes

interface StopInfo {
  item: ShioriItem;
  day: ShioriDay;
  i: number;       // global index among all stops
  top: number;     // px offset from track top
  nodeY: number;   // y centre of node for SVG path
}

interface DayHeaderInfo {
  day: ShioriDay;
  top: number;
}

function buildLayout(data: Shiori): {
  stops: StopInfo[];
  dayHeaders: DayHeaderInfo[];
  totalH: number;
} {
  const stops: StopInfo[] = [];
  const dayHeaders: DayHeaderInfo[] = [];
  let y = 0;

  for (const day of data.days) {
    dayHeaders.push({ day, top: y });
    y += DAY_H;
    for (const item of day.items) {
      stops.push({ item, day, i: stops.length, top: y, nodeY: y + ITEM_H / 2 });
      y += ITEM_H;
    }
  }

  return { stops, dayHeaders, totalH: y };
}

function buildPath(stops: StopInfo[]): string {
  return stops.reduce((acc, stop, i) => {
    const x = i % 2 === 0 ? RIGHT_X : LEFT_X;
    if (i === 0) return `M ${x} ${stop.nodeY}`;
    const prevX = (i - 1) % 2 === 0 ? RIGHT_X : LEFT_X;
    const prevY = stops[i - 1].nodeY;
    const mid = (prevY + stop.nodeY) / 2;
    return `${acc} C ${prevX} ${mid} ${x} ${mid} ${x} ${stop.nodeY}`;
  }, '');
}

interface SerpentineLayoutProps {
  data: Shiori;
}

export function SerpentineLayout({ data }: SerpentineLayoutProps) {
  const { stops, dayHeaders, totalH } = buildLayout(data);
  const pathD = buildPath(stops);

  return (
    <section className="serpentine-wrapper" data-testid="shiori-layout-serpentine">
      <div className="serpentine-track" style={{ height: `${totalH}px` }}>

        {/* SVG bezier path */}
        <svg
          className="serpentine-svg"
          viewBox={`0 0 100 ${totalH}`}
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            className="serpentine-path"
            d={pathD}
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Day header rows – full-width separators */}
        {dayHeaders.map(({ day, top }) => (
          <div
            key={day.date}
            className="serpentine-day-header"
            style={{ top: `${top}px` }}
          >
            <span className="serpentine-day-badge">{day.label}</span>
            <span className="serpentine-day-date">{day.date}</span>
          </div>
        ))}

        {/* Stop items */}
        {stops.map(({ item, day, i, top }) => {
          const side = i % 2 === 0 ? 'right' : 'left';
          return (
            <div
              key={`${day.date}-${i}-${item.time}`}
              className="serpentine-stop"
              data-side={side}
              style={{ top: `${top}px` }}
            >
              <div className="serpentine-node" aria-hidden />
              <div className="serpentine-label">
                <time className="serpentine-time">{item.time}</time>
                <strong className="serpentine-title">{item.title}</strong>
                {item.description && (
                  <p className="serpentine-desc">{item.description}</p>
                )}
                {item.place && (
                  <a
                    className="map-link serpentine-place"
                    href={resolveMapUrl(item.place, item.mapUrl)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {item.place}
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
