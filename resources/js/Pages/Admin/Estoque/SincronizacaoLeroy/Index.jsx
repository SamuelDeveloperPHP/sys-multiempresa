// resources/js/Pages/Admin/Estoque/SincronizacaoLeroy/Index.jsx
// -----------------------------------------------------------------------------
// Painel de sincronização do catálogo Leroy Merlin (scraping externo via fila).
// Dispara um SyncLeroyMerlinJob e acompanha o progresso por polling (3s)
// enquanto houver run ativo. Padrão Rise CRM.
// -----------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const STATUS_META = {
    queued:    { label: 'Na fila',      cor: 'bg-blue-100 text-blue-700',       icon: 'fa-clock' },
    running:   { label: 'Executando',   cor: 'bg-amber-100 text-amber-700',     icon: 'fa-spinner fa-spin' },
    success:   { label: 'Concluída',    cor: 'bg-emerald-100 text-emerald-700', icon: 'fa-circle-check' },
    partial:   { label: 'Parcial',      cor: 'bg-orange-100 text-orange-700',   icon: 'fa-triangle-exclamation' },
    failed:    { label: 'Falhou',       cor: 'bg-red-100 text-red-700',         icon: 'fa-circle-xmark' },
    cancelled: { label: 'Cancelada',    cor: 'bg-gray-100 text-gray-600',       icon: 'fa-ban' },
};

function StatusBadge({ status }) {
    const meta = STATUS_META[status] || STATUS_META.queued;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.cor}`}>
            <i className={`fa-solid ${meta.icon}`} />
            {meta.label}
        </span>
    );
}

function fmtData(iso) {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });
    } catch {
        return iso;
    }
}

function fmtNum(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

// Gráfico de linha leve (SVG puro, sem dependência) — "ritmo de processamento".
function Sparkline({ data = [], height = 140 }) {
    const pts = data.length >= 2 ? data : [...data, ...data];
    const w = 600;
    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const span = max - min || 1;
    const stepX = w / (pts.length - 1);
    const coords = pts.map((v, i) => [i * stepX, height - ((v - min) / span) * (height - 16) - 8]);
    const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const area = `${line} L${w},${height} L0,${height} Z`;
    return (
        <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
            <path d={area} fill="rgba(67,102,168,0.12)" />
            <path d={line} fill="none" stroke="#4366a8" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
    );
}

export default function SincronizacaoLeroyIndex({ runAtivo, ultimoRun, historico, totais, naFila, ultimosProdutos, podeIniciar }) {
    const { flash } = usePage().props;
    const [run, setRun] = useState(runAtivo || ultimoRun);
    const [totaisCatalogo, setTotaisCatalogo] = useState(totais);
    const [fila, setFila] = useState(naFila || 0);
    const [feed, setFeed] = useState(ultimosProdutos || []);
    const [volumeHist, setVolumeHist] = useState(() => [Number(totais?.produtos || 0)]);
    const [iniciando, setIniciando] = useState(false);
    const pollRef = useRef(null);

    const ativo = run?.is_ativo;

    // Polling enquanto houver run ativo (queued/running). Para quando finaliza.
    useEffect(() => {
        if (!ativo) {
            clearInterval(pollRef.current);
            return;
        }
        pollRef.current = setInterval(async () => {
            try {
                const { data } = await axios.get(route('admin.estoque.sincronizacao-leroy.status'));
                setRun(data.run);
                setTotaisCatalogo(data.totais);
                setFila(data.na_fila ?? 0);
                if (Array.isArray(data.ultimos_produtos)) setFeed(data.ultimos_produtos);
                // série temporal do volume (mantém últimos 40 pontos) → gráfico de ritmo
                setVolumeHist((h) => [...h, Number(data.totais?.produtos || 0)].slice(-40));
                if (data.run && !data.run.is_ativo) {
                    router.reload({ only: ['historico', 'ultimoRun', 'runAtivo', 'totais', 'naFila', 'ultimosProdutos'] });
                }
            } catch (e) {
                // silencioso — tenta de novo no próximo tick
            }
        }, 2000);

        return () => clearInterval(pollRef.current);
    }, [ativo]);

    const iniciar = () => {
        if (!confirm('Iniciar a sincronização do catálogo Leroy Merlin? Pode levar bastante tempo e roda em segundo plano.')) {
            return;
        }
        setIniciando(true);
        router.post(route('admin.estoque.sincronizacao-leroy.iniciar'), {}, {
            preserveScroll: true,
            onFinish: () => setIniciando(false),
            onSuccess: () => router.reload({ only: ['runAtivo', 'ultimoRun', 'historico', 'totais', 'naFila', 'ultimosProdutos'] }),
        });
    };

    const cancelar = () => {
        if (!confirm('Parar a sincronização em andamento? Os produtos já gravados permanecem; você pode iniciar de novo depois.')) {
            return;
        }
        router.post(route('admin.estoque.sincronizacao-leroy.cancelar'), {}, {
            preserveScroll: true,
            onSuccess: () => router.reload({ only: ['runAtivo', 'ultimoRun', 'historico', 'totais', 'naFila', 'ultimosProdutos'] }),
        });
    };

    const t = run?.totais || { principais: 0, primarias: 0, secundarias: 0, produtos: 0, falhas: 0 };

    const cards = [
        { label: 'Produtos no banco', valor: totaisCatalogo?.produtos, icon: 'fa-box', cor: 'text-emerald-600' },
        { label: 'Categorias na fila', valor: fila, icon: 'fa-layer-group', cor: 'text-blue-600', pulse: ativo && fila > 0 },
        { label: 'Produtos sincronizados (run)', valor: t.produtos, icon: 'fa-cloud-arrow-down', cor: 'text-rise-600' },
        { label: 'Falhas (run)', valor: t.falhas, icon: 'fa-triangle-exclamation', cor: t.falhas > 0 ? 'text-red-600' : 'text-gray-400' },
    ];

    return (
        <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Sincronização Leroy Merlin</h2>}>
            <Head title="Sincronização Leroy Merlin" />

            <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
                {/* Flash */}
                {flash?.success && (
                    <div className="mb-4 p-3 rounded border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm">
                        <i className="fa-solid fa-circle-check mr-1" /> {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="mb-4 p-3 rounded border border-red-200 bg-red-50 text-red-800 text-sm">
                        <i className="fa-solid fa-circle-exclamation mr-1" /> {flash.error}
                    </div>
                )}

                {/* Cabeçalho + ação */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <i className="fa-solid fa-cloud-arrow-down text-rise-600" />
                            Catálogo Leroy Merlin
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">
                            Importa categorias e produtos de referência da Leroy Merlin. Roda em segundo plano (fila).
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={iniciar}
                            disabled={!podeIniciar || ativo || iniciando}
                            className={`inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-bold shadow transition-colors ${
                                !podeIniciar || ativo || iniciando
                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                    : 'bg-rise-600 text-white hover:bg-rise-700'
                            }`}
                            title={!podeIniciar ? 'Apenas super-admin ou manager pode iniciar' : ''}
                        >
                            {ativo ? (
                                <><i className="fa-solid fa-spinner fa-spin mr-2" /> Sincronização em andamento…</>
                            ) : iniciando ? (
                                <><i className="fa-solid fa-spinner fa-spin mr-2" /> Enfileirando…</>
                            ) : (
                                <><i className="fa-solid fa-play mr-2" /> Iniciar sincronização</>
                            )}
                        </button>
                        {ativo && podeIniciar && (
                            <button
                                type="button"
                                onClick={cancelar}
                                className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-bold shadow bg-red-600 text-white hover:bg-red-700 transition-colors"
                                title="Parar a sincronização em andamento"
                            >
                                <i className="fa-solid fa-stop mr-2" /> Parar
                            </button>
                        )}
                    </div>
                </div>

                {/* Cards de métricas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {cards.map((c) => (
                        <div key={c.label} className={`bg-white rounded-xl shadow-sm border p-5 ${c.pulse ? 'ring-2 ring-rise-300 animate-pulse' : ''}`}>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{c.label}</span>
                                <i className={`fa-solid ${c.icon} ${c.cor}`} />
                            </div>
                            <p className={`text-3xl font-extrabold mt-2 ${c.cor}`}>{fmtNum(c.valor)}</p>
                        </div>
                    ))}
                </div>

                {/* Tempo real: Ritmo de processamento + Live Feed */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                    {/* Gráfico de ritmo */}
                    <div className="bg-white rounded-xl shadow-sm border p-5">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <i className="fa-solid fa-chart-line text-rise-600" /> Ritmo de processamento (volume no banco)
                        </h3>
                        <Sparkline data={volumeHist} />
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>{fmtNum(volumeHist[0])}</span>
                            <span className="font-semibold text-rise-600">{fmtNum(volumeHist[volumeHist.length - 1])} produtos</span>
                        </div>
                    </div>

                    {/* Live Feed */}
                    <div className="bg-gray-900 rounded-xl shadow-sm border border-gray-800 overflow-hidden flex flex-col">
                        <div className="px-4 py-2.5 border-b border-gray-800 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                <i className="fa-solid fa-terminal text-emerald-400" /> Live Feed (últimos gravados)
                            </h3>
                            {ativo && <span className="text-[10px] text-emerald-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> AO VIVO</span>}
                        </div>
                        <div className="p-3 font-mono text-xs text-emerald-300 h-56 overflow-y-auto space-y-1">
                            {feed.length === 0 ? (
                                <p className="text-gray-500 text-center mt-8">Aguardando dados…</p>
                            ) : (
                                feed.map((p, i) => (
                                    <div key={`${p.id}-${i}`} className="flex gap-2 border-b border-gray-800/60 pb-0.5">
                                        <span className="text-gray-500 whitespace-nowrap">ID {p.id}</span>
                                        <span className="text-emerald-300 truncate">{p.nome}</span>
                                        {p.marca && <span className="text-gray-500 whitespace-nowrap ml-auto">{p.marca}</span>}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Painel do run atual */}
                {run && (
                    <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-700">
                                {ativo ? 'Sincronização em andamento' : 'Última sincronização'}
                            </h3>
                            <StatusBadge status={run.status} />
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-center">
                            {[
                                { l: 'Principais', v: t.principais },
                                { l: 'Primárias', v: t.primarias },
                                { l: 'Secundárias', v: t.secundarias },
                                { l: 'Produtos', v: t.produtos },
                                { l: 'Falhas', v: t.falhas, alerta: t.falhas > 0 },
                            ].map((x) => (
                                <div key={x.l} className="bg-gray-50 rounded-lg py-3">
                                    <p className={`text-xl font-bold ${x.alerta ? 'text-red-600' : 'text-gray-800'}`}>{fmtNum(x.v)}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{x.l}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
                            <span><strong>Por:</strong> {run.usuario || '—'}</span>
                            <span><strong>Enfileirada:</strong> {fmtData(run.queued_at)}</span>
                            <span><strong>Início:</strong> {fmtData(run.started_at)}</span>
                            <span><strong>Fim:</strong> {fmtData(run.finished_at)}</span>
                        </div>

                        {run.erro_global && (
                            <div className="mt-3 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">
                                <i className="fa-solid fa-circle-exclamation mr-1" /> {run.erro_global}
                            </div>
                        )}

                        {ativo && (
                            <p className="mt-3 text-xs text-amber-600">
                                <i className="fa-solid fa-circle-info mr-1" />
                                Atualizando automaticamente a cada 3s. Você pode sair desta tela — a sincronização continua em segundo plano.
                            </p>
                        )}
                    </div>
                )}

                {/* Histórico */}
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="px-5 py-3 border-b bg-gray-50">
                        <h3 className="font-semibold text-gray-700 text-sm">Histórico (últimas 10 execuções)</h3>
                    </div>
                    {(!historico || historico.length === 0) ? (
                        <div className="text-center text-gray-400 py-10">
                            <i className="fa-solid fa-clock-rotate-left text-3xl mb-2 block text-gray-300" />
                            Nenhuma sincronização executada ainda.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                                    <tr>
                                        <th className="text-left px-4 py-2 font-semibold">#</th>
                                        <th className="text-left px-4 py-2 font-semibold">Status</th>
                                        <th className="text-left px-4 py-2 font-semibold">Por</th>
                                        <th className="text-right px-4 py-2 font-semibold">Produtos</th>
                                        <th className="text-right px-4 py-2 font-semibold">Falhas</th>
                                        <th className="text-left px-4 py-2 font-semibold">Início</th>
                                        <th className="text-left px-4 py-2 font-semibold">Fim</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {historico.map((h) => (
                                        <tr key={h.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-2 text-gray-400">{h.id}</td>
                                            <td className="px-4 py-2"><StatusBadge status={h.status} /></td>
                                            <td className="px-4 py-2 text-gray-700">{h.usuario || '—'}</td>
                                            <td className="px-4 py-2 text-right font-medium">{fmtNum(h.totais?.produtos)}</td>
                                            <td className={`px-4 py-2 text-right ${h.totais?.falhas > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                                                {fmtNum(h.totais?.falhas)}
                                            </td>
                                            <td className="px-4 py-2 text-gray-500 text-xs">{fmtData(h.started_at)}</td>
                                            <td className="px-4 py-2 text-gray-500 text-xs">{fmtData(h.finished_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Aviso */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-900">
                    <p className="font-semibold mb-1"><i className="fa-solid fa-circle-info mr-1" /> Como funciona</p>
                    <ul className="space-y-1 list-disc list-inside">
                        <li>O catálogo é uma <strong>referência de mercado</strong> (mesma pra todas as empresas), não é o estoque real.</li>
                        <li>A sincronização lê a árvore de categorias da Leroy e processa os produtos de cada categoria <strong>em paralelo</strong>.</li>
                        <li>Imagens são salvas em <code className="bg-white px-1 rounded">storage/app/public/leroy_merlin/</code>.</li>
                        <li>Ao clicar <strong>Iniciar</strong>, o sistema sobe <strong>2 workers automaticamente</strong> em segundo plano — não precisa abrir terminal.</li>
                        <li>Os workers param sozinhos quando a fila esvazia (<code className="bg-white px-1 rounded">--stop-when-empty</code>).</li>
                        <li>Só uma sincronização roda por vez. (Em hospedagem que bloqueia processos em background, use cron na fila <code className="bg-white px-1 rounded">leroy</code>.)</li>
                    </ul>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
