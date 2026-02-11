import type { Shiori } from '../../domain/entities/Shiori';

function resolveMapUrl(place: string, mapUrl?: string): string {
  if (mapUrl && mapUrl.trim()) {
    return mapUrl;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
}

interface ShioriTimelineProps {
  data: Shiori;
}

export function ShioriTimeline({ data }: ShioriTimelineProps) {
  return (
    <section className="timeline-wrapper">
      {data.days.map((day) => (
        <article className="timeline-day" key={day.date}>
          <header className="day-header">
            <span className="day-badge">{day.label}</span>
            <p className="day-date">{day.date}</p>
          </header>
          <div className="day-roadline" aria-hidden />

          <ol className="timeline-list">
            {day.items.map((item) => (
              <li className="timeline-item" key={`${day.date}-${item.time}-${item.title}`}>
                <div className="time-chip">{item.time}</div>
                <div className="timeline-content">
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
