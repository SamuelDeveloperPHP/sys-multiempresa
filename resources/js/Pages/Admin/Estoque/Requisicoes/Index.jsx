// resources/js/Pages/Admin/Estoque/Requisicoes/Index.jsx
// -----------------------------------------------------------------------------
// Lista de requisições com filtros + contadores por status. Padrão Rise.
// -----------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const STATUS_COR = {
    RASCUNHO:  { bg: 'bg-gray-100',     text: 'text-gray-700',     icon: 'fa-pen' },
    ENVIADA:   { bg: 'bg-blue-100',     text: 'text-blue-700',     icon: 'fa-paper-plane' },
    APROVADA:  { bg: 'bg-emerald-100',  text: 'text-emerald-700',  icon: 'fa-check-circle' },
    ATENDIDA:  { bg: 'bg-purple-100',   text: 'text-purple-700',   icon: 'fa-box-archive' },
    REJEITADA: { bg: 'bg-red-100',      text: 'text-red-700',      icon: 'fa-circle-xmark' },
    CANCELADA: { bg: 'bg-gray-200',     text: 'text-gray-600',     icon: 'fa-ban' },
};
const STATUS_LABEL = {
    RASCUNHO:  'Rascunho',
    ENVIADA:   'Aguardando aprovação',
    APROVADA:  'Aprovada — atender',
    ATENDIDA:  'Atendida',
    REJEITADA: 'Rejeitada',
    CANCELADA: 'Cancelada',
};

export default function RequisicoesIndex({ requisicoes, obras, contadores, filtros }) {
    const { flash } = usePage().props;
    const [f, setF] = useState({
        status:        filtros?.status ?? '',
        obra_id:       filtros?.obra_id ?? '',
        q:             filtros?.q ?? '',
        apenas_minhas: !!filtros?.apenas_minhas,
        data_de:       filtros?.data_de ?? '',
        data_ate:      filtros?.data_ate ?? '',
    });

    // Aplica filtros atuais (serializa apenas_minhas como 1/'' como o backend espera)
    const aplicar = (next = f) => {
        router.get(route('admin.estoque.requisicoes.index'), {
            ...next, apenas_minhas: next.apenas_minhas ? 1 : '',
        }, { preserveState: true, preserveScroll: true, replace: true });
    };

    // Selects/datas/checkbox aplicam imediato; o texto q é debounced (350ms)
    const setFiltro = (key, value) => {
        const next = { ...f, [key]: value };
        setF(next);
        if (key !== 'q') aplicar(next);
    };

    const qInicialRef = useRef(filtros?.q ?? '');
    useEffect(() => {
        if (f.q === qInicialRef.current) return;
        const t = setTimeout(() => {
            qInicialRef.current = f.q;
            aplicar();
        }, 350);
        return () => clearTimeout(t);
    }, [f.q]);

    const aplicarStatus = (status) => {
        const next = { ...f, status };
        setF(next);
        aplicar(next);
    };

    const limpar = () => {
        const reset = { status: '', obra_id: '', q: '', apenas_minhas: false, data_de: '', data_ate: '' };
        setF(reset);
        qInicialRef.current = '';
        router.get(route('admin.estoque.requisicoes.index'), {}, {
            preserveState: true, preserveScroll: true, replace: true,
        });
    };

    const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <AuthenticatedLayout>
            <Head title="Requisições de Estoque" />
            <div className="p-6 w-full">
                <header className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">Requisições de Estoque</h1>
                        <p className="text-sm text-gray-500">
                            Solicitação → aprovação → atendimento. Fluxo completo com auditoria.
                        </p>
                    </div>
                    <Link
                        href={route('admin.estoque.requisicoes.create')}
                        className="bg-rise-600 text-white px-4 py-2 rounded-lg hover:bg-rise-700 text-sm font-semibold"
                    >
                        + Nova requisição
                    </Link>
                </header>

                {flash?.success && (
                    <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded mb-4">
                        {flash.error}
                    </div>
                )}

                {/* Contadores por status — clicáveis para filtrar */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-4">
                    <ContadorCard
                        ativo={!f.status}
                        onClick={() => aplicarStatus('')}
                        label="Todas"
                        total={Object.values(contadores).reduce((a, b) => a + b, 0)}
                        cor="bg-gray-50 border-gray-200 text-gray-700"
                        ativoCor="bg-gray-200 border-gray-400 text-gray-800"
                    />
                    {Object.keys(STATUS_LABEL).map((st) => {
                        const c = STATUS_COR[st];
                        return (
                            <ContadorCard
                                key={st}
                                ativo={f.status === st}
                                onClick={() => aplicarStatus(st)}
                                label={STATUS_LABEL[st]}
                                total={contadores[st] || 0}
                                icon={c.icon}
                                cor={`bg-white border-gray-200 text-gray-600`}
                                ativoCor={`${c.bg} border-current ${c.text}`}
                            />
                        );
                    })}
                </div>

                {/* Filtros dinâmicos — busca conforme digita / selects e checkbox aplicam ao mudar */}
                <div className="bg-white rounded-lg border p-4 mb-4 grid grid-cols-1 md:grid-cols-6 gap-2">
                    <div className="md:col-span-2 relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 pointer-events-none">
                            <i className="fa-solid fa-magnifying-glass" />
                        </span>
                        <input
                            type="search"
                            value={f.q}
                            onChange={(e) => setF({ ...f, q: e.target.value })}
                            placeholder="Buscar por número ou observação…"
                            className="w-full border border-gray-300 rounded pl-10 pr-3 py-2 text-sm"
                        />
                    </div>
                    <select
                        value={f.obra_id}
                        onChange={(e) => setFiltro('obra_id', e.target.value)}
                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                    >
                        <option value="">Todas as obras</option>
                        {obras.map((o) => (
                            <option key={o.id} value={o.id}>{o.codigo_obra} — {o.nome_fantasia}</option>
                        ))}
                    </select>
                    <input
                        type="date" title="Data de"
                        value={f.data_de}
                        onChange={(e) => setFiltro('data_de', e.target.value)}
                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                    <input
                        type="date" title="Data até"
                        value={f.data_ate}
                        onChange={(e) => setFiltro('data_ate', e.target.value)}
                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                            type="checkbox"
                            checked={f.apenas_minhas}
                            onChange={(e) => setFiltro('apenas_minhas', e.target.checked)}
                            className="h-4 w-4 text-rise-600 rounded"
                        />
                        Apenas minhas
                    </label>
                    <div className="md:col-span-6 flex gap-2 justify-end">
                        <button type="button" onClick={limpar}
                            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm">
                            <i className="fa-solid fa-broom mr-1" /> Limpar filtros
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow border overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead className="bg-gray-50 text-left font-semibold text-gray-700">
                            <tr>
                                <th className="px-4 py-2">Número</th>
                                <th className="px-4 py-2">Status</th>
                                <th className="px-4 py-2">Solicitante</th>
                                <th className="px-4 py-2">Obra origem</th>
                                <th className="px-4 py-2">Data</th>
                                <th className="px-4 py-2 text-center">Itens</th>
                                <th className="px-4 py-2 text-right">Valor est.</th>
                                <th className="px-4 py-2 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {requisicoes.data.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center text-gray-500 py-12">
                                        <i className="fa-solid fa-clipboard-list text-3xl text-gray-300 mb-2 block" />
                                        Nenhuma requisição encontrada. Clique em <strong>Nova requisição</strong> para começar.
                                    </td>
                                </tr>
                            ) : requisicoes.data.map((r) => {
                                const sc = STATUS_COR[r.status];
                                return (
                                    <tr key={r.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-2">
                                            <Link
                                                href={route('admin.estoque.requisicoes.show', r.id)}
                                                className="font-mono font-medium text-gray-900 hover:text-rise-600"
                                            >
                                                {r.numero}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-2">
                                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${sc.bg} ${sc.text}`}>
                                                <i className={`fa-solid ${sc.icon} mr-1`} />
                                                {STATUS_LABEL[r.status]}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-gray-700">{r.solicitante?.name || '—'}</td>
                                        <td className="px-4 py-2">
                                            <div className="text-gray-700">{r.obra_origem?.codigo_obra || '—'}</div>
                                            {r.obra_origem?.nome_fantasia && (
                                                <div className="text-[11px] text-gray-400 truncate max-w-[180px]">
                                                    {r.obra_origem.nome_fantasia}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                            {new Date(r.data_solicitacao).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="px-4 py-2 text-center text-gray-600">{r.itens_count}</td>
                                        <td className="px-4 py-2 text-right whitespace-nowrap">
                                            {moeda(r.valor_total_estimado)}
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <Link
                                                href={route('admin.estoque.requisicoes.show', r.id)}
                                                className="px-2 py-1 text-gray-600 hover:bg-gray-200 rounded inline-block"
                                                title="Ver detalhes"
                                            >
                                                <i className="fa-solid fa-eye" />
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {(requisicoes.prev_page_url || requisicoes.next_page_url) && (
                    <div className="mt-4 flex items-center justify-between text-sm">
                        <span className="text-gray-600">Página {requisicoes.current_page}</span>
                        <div className="flex gap-2">
                            <a href={requisicoes.prev_page_url || '#'}
                                className={`px-3 py-1.5 rounded border text-xs ${requisicoes.prev_page_url
                                    ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                    : 'border-gray-200 text-gray-300 cursor-not-allowed pointer-events-none'}`}>
                                ← Anterior
                            </a>
                            <a href={requisicoes.next_page_url || '#'}
                                className={`px-3 py-1.5 rounded border text-xs ${requisicoes.next_page_url
                                    ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                    : 'border-gray-200 text-gray-300 cursor-not-allowed pointer-events-none'}`}>
                                Próximo →
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}

function ContadorCard({ ativo, onClick, label, total, icon, cor, ativoCor }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`text-left px-3 py-2 rounded-lg border transition ${ativo ? ativoCor : cor} hover:shadow-sm`}
        >
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium">
                    {icon && <i className={`fa-solid ${icon} mr-1`} />}
                    {label}
                </span>
                <span className="text-base font-bold">{total}</span>
            </div>
        </button>
    );
}
