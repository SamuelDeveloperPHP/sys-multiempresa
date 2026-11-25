import { Head, Link } from '@inertiajs/react';
import { useCallback, useRef, useState } from 'react';
import Dockyard from './Dockyard';
import YardFeed from './YardFeed';
import IsoIcon from './IsoIcon';
import './fleet-landing.css';

const modules = [
    ['LOC', 'Locações', 'Confira a locação ativa e consulte os períodos anteriores na ficha do veículo.', 'rental'],
    ['MNT', 'Manutenção', 'Acompanhe serviços preventivos e corretivos ao longo da vida do veículo.', 'maintenance'],
    ['PNU', 'Pneus', 'Consulte o estoque, a posição de montagem e o histórico de inspeções de cada pneu.', 'tyres'],
    ['GPS', 'Rastreamento', 'Conecte os rastreadores e a telemetria dos veículos. Requer as credenciais de acesso do seu provedor.', 'tracking'],
];

const signals = ['Posição GPS', 'Velocidade', 'Ignição', 'Hodômetro'];

function TelemetryCard() {
    return <section className="hud-glass p-5" aria-labelledby="telemetry-title">
        <p className="hud-kicker"><span className="hud-dot" aria-hidden="true" /> Integração</p>
        <h2 id="telemetry-title" className="mt-2 text-lg font-bold text-white">Rastreadores e telemetria</h2>
        <p className="mt-2 text-sm text-[#c4d2dc]">O sistema se conecta aos rastreadores veiculares e à telemetria da frota: os dados chegam direto ao painel.</p>
        <ul className="mt-3 flex flex-wrap gap-1.5">{signals.map(signal => <li key={signal} className="yard-signal">{signal}</li>)}</ul>
        <p className="yard-credential mt-4"><span aria-hidden="true">🔒</span> Requer credenciais de acesso fornecidas pelo seu provedor de rastreamento.</p>
    </section>;
}

const stages = [
    ['Fase 01', 'Pátio', 'Cadastre os veículos e veja onde cada um está.', 'dock'],
    ['Fase 02', 'Locação', 'Reserve, entregue e receba de volta com histórico.', 'rental'],
    ['Fase 03', 'Oficina', 'Registre manutenções e mantenha a frota rodando.', 'maintenance'],
    ['Fase 04', 'Pneus', 'Controle montagem, rodízio e inspeções.', 'tyres'],
];

function Panel({ tag, children, className = '' }) {
    return <div className={'hud-panel ' + className}>
        {tag && <span className="hud-tag">{tag}</span>}
        {children}
    </div>;
}

export default function Welcome({ auth, canLogin, canRegister }) {
    const access = auth?.user ? 'dashboard' : canLogin ? 'login' : null;
    const [selected, setSelected] = useState(0);
    const [events, setEvents] = useState([]);
    const nextId = useRef(0);
    // The yard simulation reports each phase change; the feed keeps the latest five.
    const pushEvent = useCallback(event => setEvents(list => [{ ...event, id: nextId.current++ }, ...list].slice(0, 5)), []);
    return <main className="fleet-landing min-h-screen">
        <Head title="Gestão e locação de frotas" />

        <header className="hud-bar">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 lg:px-12">
                <Link href="/" className="flex items-center gap-2 font-bold"><span aria-hidden="true" className="hud-logo">↗</span> Gestão de Frotas</Link>
                <nav aria-label="Seções" className="hidden gap-6 font-mono text-xs uppercase tracking-widest text-[#9de5d4] md:flex">
                    <a href="#modulos">Módulos</a><a href="#fases">Fases</a><a href="#iniciar">Iniciar</a>
                </nav>
                {access && <Link href={route(access)} className="hud-button-ghost">{auth?.user ? 'Meu painel' : 'Entrar'}</Link>}
            </div>
        </header>

        <section className="mx-auto max-w-[1680px] px-3 py-5 lg:px-6 lg:py-8">
            <Dockyard selected={selected} onSelect={setSelected} onEvent={pushEvent}
                left={<>
                    <div className="hud-glass p-6">
                        <p className="hud-kicker"><span className="hud-dot" aria-hidden="true" /> Central de operação</p>
                        <h1 className="mt-3 text-4xl font-bold leading-none tracking-tight xl:text-5xl">Sua frota, do pátio à locação.</h1>
                        <p className="my-4 text-base text-[#c4d2dc]">Acompanhe caminhões, ônibus, vans e carros, alugue os veículos da sua empresa e consulte o histórico de locações.</p>
                        <div className="flex flex-wrap items-center gap-5">
                            {access && <Link className="hud-button" href={route(access)}>Acessar painel</Link>}
                            {!auth?.user && canRegister && <Link className="underline underline-offset-4" href={route('register')}>Criar conta</Link>}
                        </div>
                    </div>
                    <YardFeed events={events} selected={selected} onSelect={setSelected} />
                </>}
                right={<TelemetryCard />} />
        </section>

        <section id="modulos" className="hud-grid-bg">
            <div className="mx-auto max-w-7xl px-5 py-14 lg:px-12">
                <p className="hud-kicker">Módulos</p>
                <h2 className="mt-2 text-3xl font-bold">Gestão por veículo</h2>
                <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{modules.map(([code, title, description, scene]) =>
                    <Panel key={title} tag={code} className="p-6 text-center">
                        <div className="hud-orb mx-auto"><IsoIcon scene={scene} className="h-28 w-36" /></div>
                        <h3 className="mt-4 text-xl font-bold text-white">{title}</h3>
                        <p className="mx-auto mt-2 max-w-xs text-[#c4d2dc]">{description}</p>
                    </Panel>)}
                </div>
            </div>
        </section>

        <section id="fases">
            <div className="mx-auto max-w-7xl px-5 py-14 lg:px-12">
                <p className="hud-kicker">Fases da operação</p>
                <h2 className="mt-2 text-3xl font-bold">Do cadastro ao controle de pneus</h2>
                <div className="relative mt-12">
                    <svg viewBox="0 0 1000 200" preserveAspectRatio="none" className="hud-road absolute inset-x-0 top-6 hidden h-48 w-full md:block" aria-hidden="true">
                        <path d="M0 60 C 120 60, 130 150, 250 150 S 380 60, 500 60 S 630 150, 750 150 S 880 60, 1000 60" className="hud-road-base" />
                        <path d="M0 60 C 120 60, 130 150, 250 150 S 380 60, 500 60 S 630 150, 750 150 S 880 60, 1000 60" className="hud-road-line" />
                    </svg>
                    <ol className="relative grid gap-10 md:grid-cols-4 md:gap-6">{stages.map(([stage, title, description, scene], i) =>
                        <li key={stage} className={'flex flex-col items-center text-center ' + (i % 2 ? 'md:mt-24' : '')}>
                            <div className="hud-stop"><IsoIcon scene={scene} className="h-20 w-24" /><span className="hud-node" aria-hidden="true">{i + 1}</span></div>
                            <p className="hud-label mt-4">{stage}</p>
                            <h3 className="mt-1 text-lg font-bold text-white">{title}</h3>
                            <p className="mt-1 max-w-[15rem] text-sm text-[#c4d2dc]">{description}</p>
                        </li>)}
                    </ol>
                </div>
            </div>
        </section>

        <section id="iniciar" className="mx-auto max-w-7xl px-5 pb-16 lg:px-12">
            <Panel className="hud-cta flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center">
                <div>
                    <h2 className="text-3xl font-bold text-white">Pronto para assumir o controle?</h2>
                    <p className="mt-2 max-w-xl text-[#c4d2dc]">Entre no painel e comece pelo cadastro dos veículos da sua empresa.</p>
                </div>
                {access && <Link className="hud-button" href={route(access)}>Iniciar operação ▸</Link>}
            </Panel>
        </section>

        <footer className="hud-bar border-t border-white/10 font-mono text-xs text-[#7f9bab]">
            <div className="mx-auto flex max-w-7xl justify-between px-5 py-4 lg:px-12"><span>Gestão de Frotas</span><span>Sistema online</span></div>
        </footer>
    </main>;
}
