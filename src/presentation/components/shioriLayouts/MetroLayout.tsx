import type { Shiori } from '../../../domain/entities/Shiori';
import { resolveMapUrl } from './mapLink';

interface MetroLayoutProps {
  data: Shiori;
}

export function MetroLayout({ data }: MetroLayoutProps) {
  return (
    <section className="metro-wrapper" data-testid="shiori-layout-metro">
      {data.days.map((day) => (
        <article className="metro-day" key={day.date}>
          <header className="metro-day-header">
            <span className="metro-day-badge">{day.label}</span>
            <p className="metro-day-date">{day.date}</p>
          </header>

          <ol className="metro-list">
            {day.items.map((item) => (
              <li className="metro-item" key={`${day.date}-${item.time}-${item.title}`}>
                <div className="metro-stop">
                  <span className="metro-time">{item.time}</span>
                  <span className="metro-dot" aria-hidden />
                </div>
                <div className="metro-content">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <p className="place-label">場所: {item.place}</p>
                  <a
                    className="map-link"
                    href={resolveMapUrl(item.place, item.mapUrl)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Google Mapsで見る
                  </a>
                </div>
              </li>
            ))}
          </ol>
        </article>
      ))}
    </section>
  );
}

