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

export default function SincronizacaoLeroyIndex({ runAtivo, ultimoRun, historico, totais, podeIniciar }) {
    const { flash } = usePage().props;
    const [run, setRun] = useState(runAtivo || ultimoRun);
    const [totaisCatalogo, setTotaisCatalogo] = useState(totais);
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
                // Quando o run deixa de estar ativo, recarrega a página (atualiza histórico via Inertia)
                if (data.run && !data.run.is_ativo) {
                    router.reload({ only: ['historico', 'ultimoRun', 'runAtivo', 'totais'] });
                }
            } catch (e) {
                // silencioso — tenta de novo no próximo tick
            }
        }, 3000);

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
            onSuccess: () => router.reload({ only: ['runAtivo', 'ultimoRun', 'historico', 'totais'] }),
        });
    };

    const t = run?.totais || { principais: 0, primarias: 0, secundarias: 0, produtos: 0, falhas: 0 };

    const cards = [
        { label: 'Produtos no catálogo', valor: totaisCatalogo?.produtos, icon: 'fa-box', cor: 'text-emerald-600' },
        { label: 'Categorias principais (run)', valor: t.principais, icon: 'fa-folder-tree', cor: 'text-blue-600' },
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
                </div>

                {/* Cards de métricas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {cards.map((c) => (
                        <div key={c.label} className="bg-white rounded-xl shadow-sm border p-5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{c.label}</span>
                                <i className={`fa-solid ${c.icon} ${c.cor}`} />
                            </div>
                            <p className={`text-3xl font-extrabold mt-2 ${c.cor}`}>{fmtNum(c.valor)}</p>
                        </div>
                    ))}
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
                        <li>A sincronização lê a árvore de categorias da Leroy e baixa os produtos de cada categoria-folha.</li>
                        <li>Imagens são salvas em <code className="bg-white px-1 rounded">storage/app/public/leroy_merlin/</code>.</li>
                        <li>Roda em <strong>fila</strong> (precisa de worker ativo: <code className="bg-white px-1 rounded">php artisan queue:work</code>).</li>
                        <li>Só uma sincronização roda por vez.</li>
                    </ul>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
