import { tags } from './yardScene';

// Simulated yard clock: the day starts at 08:00 and one real second is one yard minute.
const clock = at => {
    const minutes = 8 * 60 + Math.floor(at / 1000);
    return `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
};

export default function YardFeed({ events, selected, onSelect }) {
    return <section className="yard-feed hud-glass" aria-label="Eventos do pátio">
        <header className="flex items-center justify-between px-4 pt-3">
            <span className="hud-label">Eventos do pátio</span>
            <span className="font-mono text-xs text-[#9fb4c2]">{events[0] ? clock(events[0].at) : '08:00'}</span>
        </header>
        <ol className="mt-2 px-2 pb-2">{events.map(event =>
            <li key={event.id} className="yard-feed-item">
                <button type="button" onClick={() => onSelect(event.lane)} aria-pressed={selected === event.lane} style={{ '--tone': tags[event.tag] }}>
                    <span className="font-mono text-xs text-[#9fb4c2]">{clock(event.at)}</span>
                    <span className="yard-feed-tag">{event.tag}</span>
                    <span className="min-w-0 truncate text-sm">{event.text}</span>
                </button>
            </li>)}
        </ol>
    </section>;
}
