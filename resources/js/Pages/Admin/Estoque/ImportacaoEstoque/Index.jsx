// resources/js/Pages/Admin/Estoque/ImportacaoEstoque/Index.jsx
// -----------------------------------------------------------------------------
// PONTE: importa o catálogo Leroy (referência) -> estoque_produtos (operacional).
// Tela de transferência: barra de % concluída + progresso por categoria (live
// feed) com polling. Padrão Rise.
// -----------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const STATUS_META = {
    queued:    { label: 'Na fila',     cor: 'bg-blue-100 text-blue-700',       icon: 'fa-clock' },
    running:   { label: 'Importando',  cor: 'bg-amber-100 text-amber-700',     icon: 'fa-spinner fa-spin' },
    success:   { label: 'Concluída',   cor: 'bg-emerald-100 text-emerald-700', icon: 'fa-circle-check' },
    partial:   { label: 'Parcial',     cor: 'bg-orange-100 text-orange-700',   icon: 'fa-triangle-exclamation' },
    failed:    { label: 'Falhou',      cor: 'bg-red-100 text-red-700',         icon: 'fa-circle-xmark' },
    cancelled: { label: 'Cancelada',   cor: 'bg-gray-100 text-gray-600',       icon: 'fa-ban' },
};

function StatusBadge({ status }) {
    const m = STATUS_META[status] || STATUS_META.queued;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${m.cor}`}>
            <i className={`fa-solid ${m.icon}`} /> {m.label}
        </span>
    );
}

const fmt = (n) => Number(n || 0).toLocaleString('pt-BR');
const fmtData = (iso) => { try { return iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' }) : '—'; } catch { return iso; } };

// Gráfico de linha leve (SVG puro, sem dependência) — "ritmo de importação".
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

export default function ImportacaoEstoqueIndex({ importacaoAtiva, ultima, historico, totais, naFila, ultimosProdutos, podeIniciar }) {
    const { flash } = usePage().props;
    const [run, setRun] = useState(importacaoAtiva || ultima);
    const [tot, setTot] = useState(totais);
    const [fila, setFila] = useState(naFila || 0);
    const [feed, setFeed] = useState(ultimosProdutos || []);
    const [volumeHist, setVolumeHist] = useState(() => [Number(totais?.produtos_do_leroy || 0)]);
    const [iniciando, setIniciando] = useState(false);
    const pollRef = useRef(null);

    const ativo = run?.is_ativo;
    const pct = run?.percentual ?? 0;

    useEffect(() => {
        if (!ativo) { clearInterval(pollRef.current); return; }
        pollRef.current = setInterval(async () => {
            try {
                const { data } = await axios.get(route('admin.estoque.importacao.status'));
                setRun(data.run);
                setTot(data.totais);
                setFila(data.na_fila ?? 0);
                if (Array.isArray(data.ultimos_produtos)) setFeed(data.ultimos_produtos);
                setVolumeHist((h) => [...h, Number(data.totais?.produtos_do_leroy || 0)].slice(-40));
                if (data.run && !data.run.is_ativo) {
                    router.reload({ only: ['importacaoAtiva', 'ultima', 'historico', 'totais', 'naFila', 'ultimosProdutos'] });
                }
            } catch (e) { /* tenta no próximo tick */ }
        }, 2000);
        return () => clearInterval(pollRef.current);
    }, [ativo]);

    const iniciar = () => {
        if (!confirm('Importar o catálogo Leroy para o estoque operacional? Roda em segundo plano.')) return;
        setIniciando(true);
        router.post(route('admin.estoque.importacao.iniciar'), {}, {
            preserveScroll: true,
            onFinish: () => setIniciando(false),
            onSuccess: () => router.reload({ only: ['importacaoAtiva', 'ultima', 'historico', 'totais', 'naFila', 'ultimosProdutos'] }),
        });
    };

    const cancelar = () => {
        if (!confirm('Parar a importação em andamento? Os produtos já importados permanecem; você pode iniciar de novo depois.')) return;
        router.post(route('admin.estoque.importacao.cancelar'), {}, {
            preserveScroll: true,
            onSuccess: () => router.reload({ only: ['importacaoAtiva', 'ultima', 'historico', 'totais', 'naFila', 'ultimosProdutos'] }),
        });
    };

    const t = run?.totais || { previsto: 0, importados: 0, categorias: 0, imagens: 0, falhas: 0 };

    const cards = [
        { label: 'Produtos no estoque', valor: tot?.produtos_estoque, icon: 'fa-box', cor: 'text-emerald-600' },
        { label: 'Vindos da Leroy', valor: tot?.produtos_do_leroy, icon: 'fa-cloud-arrow-down', cor: 'text-rise-600' },
        { label: 'Categorias na fila', valor: fila, icon: 'fa-layer-group', cor: 'text-blue-600', pulse: ativo && fila > 0 },
        { label: 'Falhas (execução)', valor: t.falhas, icon: 'fa-triangle-exclamation', cor: t.falhas > 0 ? 'text-red-600' : 'text-gray-400' },
    ];

    return (
        <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Importar catálogo Leroy → Estoque</h2>}>
            <Head title="Importação de Estoque" />

            <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
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
                            <i className="fa-solid fa-arrow-right-arrow-left text-rise-600" />
                            Importação para o estoque
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">
                            Transfere os produtos únicos da Leroy para o estoque operacional (global, movimentável).
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
                            title={!podeIniciar ? 'Apenas super-admin ou manager' : ''}
                        >
                            {ativo ? <><i className="fa-solid fa-spinner fa-spin mr-2" /> Importando…</>
                                : iniciando ? <><i className="fa-solid fa-spinner fa-spin mr-2" /> Enfileirando…</>
                                : <><i className="fa-solid fa-download mr-2" /> Importar agora</>}
                        </button>
                        {ativo && podeIniciar && (
                            <button
                                type="button"
                                onClick={cancelar}
                                className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-bold shadow bg-red-600 text-white hover:bg-red-700 transition-colors"
                                title="Parar a importação em andamento"
                            >
                                <i className="fa-solid fa-stop mr-2" /> Parar
                            </button>
                        )}
                    </div>
                </div>

                {/* BARRA DE PROGRESSO */}
                {run && (
                    <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-gray-700">
                                {ativo ? 'Importação em andamento' : 'Última importação'}
                            </h3>
                            <StatusBadge status={run.status} />
                        </div>

                        <div className="mb-2 flex items-end justify-between">
                            <span className="text-3xl font-extrabold text-rise-600">{pct}%</span>
                            <span className="text-sm text-gray-500">
                                {fmt(t.importados)} / {fmt(t.previsto)} produtos
                            </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                            <div
                                className={`h-4 rounded-full transition-all duration-700 ease-out ${
                                    run.status === 'failed' ? 'bg-red-500'
                                    : run.status === 'partial' ? 'bg-orange-500'
                                    : ativo ? 'bg-rise-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.max(pct, run.status !== 'queued' ? 2 : 0)}%` }}
                            />
                        </div>

                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                            {[
                                { l: 'Categorias', v: t.categorias },
                                { l: 'Importados', v: t.importados },
                                { l: 'Imagens', v: t.imagens },
                                { l: 'Falhas', v: t.falhas, alerta: t.falhas > 0 },
                            ].map((x) => (
                                <div key={x.l} className="bg-gray-50 rounded-lg py-2">
                                    <p className={`text-lg font-bold ${x.alerta ? 'text-red-600' : 'text-gray-800'}`}>{fmt(x.v)}</p>
                                    <p className="text-xs text-gray-500">{x.l}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
                            <span><strong>Por:</strong> {run.usuario || '—'}</span>
                            <span><strong>Início:</strong> {fmtData(run.started_at)}</span>
                            <span><strong>Fim:</strong> {fmtData(run.finished_at)}</span>
                        </div>

                        {run.erro_global && (
                            <div className="mt-3 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">
                                <i className="fa-solid fa-circle-exclamation mr-1" /> {run.erro_global}
                            </div>
                        )}

                        {/* LIVE FEED por categoria */}
                        {run.feed?.length > 0 && (
                            <div className="mt-4">
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Últimas categorias processadas</p>
                                <div className="bg-gray-900 rounded-lg p-3 font-mono text-xs text-emerald-300 max-h-44 overflow-y-auto space-y-1">
                                    {[...run.feed].reverse().map((f, i) => (
                                        <div key={i} className="flex justify-between gap-3">
                                            <span className="truncate"><span className="text-gray-500">›</span> {f.categoria}</span>
                                            <span className="text-gray-400 whitespace-nowrap">
                                                +{fmt(f.importados)}{f.falhas > 0 && <span className="text-red-400"> / {fmt(f.falhas)} falhas</span>}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {ativo && (
                            <p className="mt-3 text-xs text-amber-600">
                                <i className="fa-solid fa-circle-info mr-1" />
                                Atualizando a cada 2s. Pode sair desta tela — a importação continua em segundo plano.
                            </p>
                        )}
                    </div>
                )}

                {/* Cards de métricas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {cards.map((c) => (
                        <div key={c.label} className={`bg-white rounded-xl shadow-sm border p-5 ${c.pulse ? 'ring-2 ring-rise-300 animate-pulse' : ''}`}>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{c.label}</span>
                                <i className={`fa-solid ${c.icon} ${c.cor}`} />
                            </div>
                            <p className={`text-3xl font-extrabold mt-2 ${c.cor}`}>{fmt(c.valor)}</p>
                        </div>
                    ))}
                </div>

                {/* Tempo real: Ritmo de importação + Live Feed de produtos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                    <div className="bg-white rounded-xl shadow-sm border p-5">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <i className="fa-solid fa-chart-line text-rise-600" /> Ritmo de importação (produtos no estoque)
                        </h3>
                        <Sparkline data={volumeHist} />
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>{fmt(volumeHist[0])}</span>
                            <span className="font-semibold text-rise-600">{fmt(volumeHist[volumeHist.length - 1])} produtos</span>
                        </div>
                    </div>

                    <div className="bg-gray-900 rounded-xl shadow-sm border border-gray-800 overflow-hidden flex flex-col">
                        <div className="px-4 py-2.5 border-b border-gray-800 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                <i className="fa-solid fa-terminal text-emerald-400" /> Live Feed (produtos importados)
                            </h3>
                            {ativo && <span className="text-[10px] text-emerald-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> AO VIVO</span>}
                        </div>
                        <div className="p-3 font-mono text-xs text-emerald-300 h-56 overflow-y-auto space-y-1">
                            {feed.length === 0 ? (
                                <p className="text-gray-500 text-center mt-8">Aguardando dados…</p>
                            ) : (
                                feed.map((p, i) => (
                                    <div key={`${p.id}-${i}`} className="flex gap-2 border-b border-gray-800/60 pb-0.5">
                                        <span className="text-gray-500 whitespace-nowrap">#{p.id}</span>
                                        <span className="text-emerald-300 truncate">{p.nome}</span>
                                        <span className="text-gray-500 whitespace-nowrap ml-auto">
                                            {p.marca || '—'}{p.valor ? ` · R$ ${p.valor}` : ''}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Histórico */}
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="px-5 py-3 border-b bg-gray-50">
                        <h3 className="font-semibold text-gray-700 text-sm">Histórico (últimas 10)</h3>
                    </div>
                    {(!historico || historico.length === 0) ? (
                        <div className="text-center text-gray-400 py-10">
                            <i className="fa-solid fa-clock-rotate-left text-3xl mb-2 block text-gray-300" />
                            Nenhuma importação executada ainda.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                                    <tr>
                                        <th className="text-left px-4 py-2 font-semibold">#</th>
                                        <th className="text-left px-4 py-2 font-semibold">Status</th>
                                        <th className="text-left px-4 py-2 font-semibold">%</th>
                                        <th className="text-left px-4 py-2 font-semibold">Por</th>
                                        <th className="text-right px-4 py-2 font-semibold">Importados</th>
                                        <th className="text-right px-4 py-2 font-semibold">Falhas</th>
                                        <th className="text-left px-4 py-2 font-semibold">Fim</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {historico.map((h) => (
                                        <tr key={h.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-2 text-gray-400">{h.id}</td>
                                            <td className="px-4 py-2"><StatusBadge status={h.status} /></td>
                                            <td className="px-4 py-2 font-medium">{h.percentual}%</td>
                                            <td className="px-4 py-2 text-gray-700">{h.usuario || '—'}</td>
                                            <td className="px-4 py-2 text-right font-medium">{fmt(h.totais?.importados)}</td>
                                            <td className={`px-4 py-2 text-right ${h.totais?.falhas > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}`}>{fmt(h.totais?.falhas)}</td>
                                            <td className="px-4 py-2 text-gray-500 text-xs">{fmtData(h.finished_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-900">
                    <p className="font-semibold mb-1"><i className="fa-solid fa-circle-info mr-1" /> Como funciona</p>
                    <ul className="space-y-1 list-disc list-inside">
                        <li>Importa <strong>categorias, famílias, produtos, marca, unidade e imagens</strong> da Leroy para o estoque <strong>global</strong> (todas as obras/empresas).</li>
                        <li>O <strong>preço</strong> entra como <strong>referência</strong> (somente consulta — campo travado no produto).</li>
                        <li>SKU único global (<code className="bg-white px-1 rounded">LM-&#123;id&#125;</code>) → sem duplicação por empresa; re-importar atualiza, não duplica.</li>
                        <li>Depois de importado, o produto fica <strong>movimentável</strong> (entrada/saída/requisição).</li>
                        <li>Roda em fila com <strong>2 workers automáticos</strong> (sem terminal).</li>
                    </ul>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
