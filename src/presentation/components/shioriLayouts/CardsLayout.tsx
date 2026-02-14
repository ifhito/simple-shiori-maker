import type { Shiori } from '../../../domain/entities/Shiori';
import { resolveMapUrl } from './mapLink';

interface CardsLayoutProps {
  data: Shiori;
}

export function CardsLayout({ data }: CardsLayoutProps) {
  return (
    <section className="cards-wrapper" data-testid="shiori-layout-cards">
      {data.days.map((day) => (
        <article className="cards-day" key={day.date}>
          <header className="cards-day-header">
            <span className="cards-day-badge">{day.label}</span>
            <p className="cards-day-date">{day.date}</p>
          </header>

          <div className="cards-items">
            {day.items.map((item) => (
              <article className="cards-item" key={`${day.date}-${item.time}-${item.title}`}>
                <header className="cards-item-header">
                  <span className="time-chip">{item.time}</span>
                  <h3>{item.title}</h3>
                </header>
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
              </article>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}

