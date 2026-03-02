import type { Shiori } from '../../../domain/entities/Shiori';
import { resolveMapUrl } from './mapLink';

interface TicketLayoutProps {
  data: Shiori;
}

export function TicketLayout({ data }: TicketLayoutProps) {
  return (
    <section className="ticket-wrapper" data-testid="shiori-layout-ticket">
      {data.days.map((day) => (
        <article className="ticket-day" key={day.date}>
          <header className="ticket-day-header">
            <span className="ticket-day-badge">{day.label}</span>
            <p className="ticket-day-date">{day.date}</p>
          </header>

          <ol className="ticket-list">
            {day.items.map((item) => (
              <li className="ticket-item" key={`${day.date}-${item.time}-${item.title}`}>
                <div className="time-chip">{item.time}</div>
                <div className="ticket-content">
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

