import { useEffect, useRef, useState } from 'react';
import { bays, kinds, laneAt, paint, project, VIEW } from './yardScene';

// Full-width hero stage: the city-block diorama fills the background and the HUD columns float over its sides.
export default function Dockyard({ selected, onSelect, onEvent, left, right }) {
    const canvas = useRef(null), elapsed = useRef(0), labels = useRef([]), counter = useRef(null), steps = useRef([]), emit = useRef(onEvent);
    emit.current = onEvent;
    const [paused, setPaused] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    useEffect(() => {
        const ctx = canvas.current.getContext('2d');
        if (!ctx) return;
        let frame, last;
        function draw(now) {
            if (last !== undefined && !paused) elapsed.current += Math.min(now - last, 100);
            last = now;
            ctx.setTransform(2, 0, 0, 2, 0, 0);
            paint(ctx, elapsed.current, selected);
            labels.current.forEach((el, i) => {
                const lane = laneAt(i, elapsed.current);
                el.dataset.state = ['entering', 'service', 'leaving'][lane.step];
                el.querySelector('.yard-status').textContent = lane.status;
                el.querySelector('.yard-plate').textContent = lane.plate;
                el.querySelector('.yard-kind').textContent = kinds[lane.kind];
                el.querySelector('progress').value = lane.progress;
                if (steps.current[i] !== lane.key) {
                    steps.current[i] = lane.key;
                    emit.current?.({ lane: i, tag: lane.tag, text: lane.event, at: elapsed.current });
                }
            });
            const out = laneAt(0, elapsed.current);
            counter.current.textContent = String(out.n + (out.step === 2 ? 1 : 0)).padStart(3, '0');
            if (!paused) frame = requestAnimationFrame(draw);
        }
        draw(performance.now());
        return () => cancelAnimationFrame(frame);
    }, [paused, selected]);

    const focus = project(8 + selected * 116 + 39, 70, 10)[1] / VIEW.height * 100;
    return <figure className="yard-stage">
        {/* Tilt-shift: blur layers above and below a sharp band that follows the selected bay. */}
        <div className="yard-diorama" style={{ '--focus': `${focus}%` }}>
            <canvas ref={canvas} width={VIEW.width * 2} height={VIEW.height * 2} role="img"
                aria-label="Maquete de um quarteirão com o pátio da frota: caminhões, ônibus, vans e carros passam pela retirada, vistoria e oficina, com rastreadores enviando sinal para a central de telemetria" />
            <div className="yard-blur yard-blur-soft" aria-hidden="true" />
            <div className="yard-blur yard-blur-strong" aria-hidden="true" />
        </div>
        <div className="yard-hud">
            <div className="yard-col">{left}</div>
            <div className="yard-center">
                <div className="yard-controls hud-glass">
                    <strong className="text-sm">Pátio da frota</strong>
                    <span className={'yard-live ' + (paused ? 'is-paused' : '')}><i aria-hidden="true" />{paused ? 'Pausado' : 'Ao vivo'}</span>
                    <span className="font-mono text-xs text-[#9de5d4]">Locações <b ref={counter} className="text-white">000</b></span>
                    <button type="button" onClick={() => setPaused(p => !p)} className="yard-pill">{paused ? '▶ Retomar' : 'Ⅱ Pausar'}</button>
                </div>
            </div>
            <div className="yard-col">
                {right}
                <div className="yard-bays">{bays.map((bay, i) => <button type="button" key={bay.code} aria-pressed={selected === i} onClick={() => onSelect(i)}
                    className="yard-dock" style={{ '--tone': bay.tone }} ref={el => { labels.current[i] = el; }}>
                    <span className="flex items-center gap-2"><i className="yard-led" aria-hidden="true" /><b className="text-sm">{bay.name}</b><span className="yard-kind ml-auto text-[0.65rem] uppercase tracking-wider text-[#9fb4c2]" /></span>
                    <span className="mt-1 flex justify-between gap-2 text-xs"><span className="yard-status">—</span><span className="yard-plate text-[#9fb4c2]" /></span>
                    <progress className="yard-progress" aria-label={'Andamento em ' + bay.name} max="1" defaultValue="0" />
                </button>)}</div>
            </div>
        </div>
    </figure>;
}
