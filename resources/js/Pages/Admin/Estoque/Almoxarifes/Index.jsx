// resources/js/Pages/Admin/Estoque/Almoxarifes/Index.jsx
// -----------------------------------------------------------------------------
// Tela de gestão de almoxarifes (aprovadores de devolução de estoque).
// Toggle por usuário concede can_update no módulo estoque.devolucoes
// na empresa selecionada. Padrão Rise.
// -----------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function AlmoxarifesIndex({ companies, companySelecionada, users, busca, totalAlmoxarifes }) {
    const { flash } = usePage().props;
    const [q, setQ] = useState(busca || '');
    const [companyId, setCompanyId] = useState(companySelecionada);
    const [selecionados, setSelecionados] = useState([]);

    const aplicarFiltros = (extras = {}) => {
        router.get(
            route('admin.estoque.almoxarifes.index'),
            { q, company_id: companyId, ...extras },
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    // Busca dinâmica com debounce de 350ms — sem precisar clicar em "Buscar"
    const buscaInicialRef = useRef(busca || '');
    useEffect(() => {
        if (q === buscaInicialRef.current) return;
        const t = setTimeout(() => {
            buscaInicialRef.current = q;
            aplicarFiltros();
        }, 350);
        return () => clearTimeout(t);
    }, [q]);

    const toggle = (user, ativar) => {
        if (user.eh_super) {
            alert('Super-admin já tem acesso total — não precisa marcar como almoxarife.');
            return;
        }
        router.post(route('admin.estoque.almoxarifes.toggle'), {
            user_id:    user.id,
            company_id: companyId,
            ativar,
        }, { preserveScroll: true });
    };

    const toggleSelecao = (userId) => {
        setSelecionados((curr) =>
            curr.includes(userId) ? curr.filter((id) => id !== userId) : [...curr, userId]
        );
    };

    const bulkAtivar = () => {
        if (selecionados.length === 0) return;
        if (!confirm(`Marcar ${selecionados.length} usuário(s) como almoxarife?`)) return;
        router.post(route('admin.estoque.almoxarifes.bulk'), {
            company_id: companyId,
            user_ids:   selecionados,
            ativar:     true,
        }, { preserveScroll: true, onSuccess: () => setSelecionados([]) });
    };

    const bulkDesativar = () => {
        if (selecionados.length === 0) return;
        if (!confirm(`Remover ${selecionados.length} usuário(s) da lista de almoxarifes?`)) return;
        router.post(route('admin.estoque.almoxarifes.bulk'), {
            company_id: companyId,
            user_ids:   selecionados,
            ativar:     false,
        }, { preserveScroll: true, onSuccess: () => setSelecionados([]) });
    };

    const empresaAtual = companies.find((c) => Number(c.id) === Number(companyId));

    return (
        <AuthenticatedLayout>
            <Head title="Almoxarifes" />
            <div className="p-6 w-full max-w-6xl mx-auto">
                <header className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">Almoxarifes</h1>
                        <p className="text-sm text-gray-500">
                            Defina quais usuários podem <strong>aprovar/rejeitar devoluções</strong> de estoque.
                            A configuração é por empresa — um almoxarife da Empresa A não aprova da B.
                        </p>
                    </div>
                    <Link href={route('admin.estoque.devolucoes.index')}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                        ← Voltar para devoluções
                    </Link>
                </header>

                {flash?.success && <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4">{flash.success}</div>}
                {flash?.error && <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded mb-4">{flash.error}</div>}

                {/* Painel da empresa */}
                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <i className="fa-solid fa-building text-emerald-600 text-2xl" />
                            <div>
                                <label className="block text-xs text-emerald-700 font-semibold uppercase tracking-wide">
                                    Empresa
                                </label>
                                <select
                                    value={companyId}
                                    onChange={(e) => {
                                        setCompanyId(e.target.value);
                                        router.get(route('admin.estoque.almoxarifes.index'),
                                            { company_id: e.target.value, q },
                                            { preserveScroll: true }
                                        );
                                    }}
                                    className="text-base font-semibold text-emerald-900 bg-transparent border-0 border-b-2 border-emerald-300 focus:border-emerald-600 focus:ring-0 px-0"
                                >
                                    {companies.map((c) => (
                                        <option key={c.id} value={c.id}>{c.nome_fantasia || c.razao_social}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-emerald-700 font-semibold uppercase tracking-wide">Almoxarifes ativos</p>
                            <p className="text-3xl font-bold text-emerald-900">{totalAlmoxarifes}</p>
                        </div>
                    </div>
                </div>

                {/* Filtro dinâmico — busca conforme digita (debounce 350ms) */}
                <div className="bg-white border rounded-lg p-4 mb-4">
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 pointer-events-none">
                            <i className="fa-solid fa-magnifying-glass" />
                        </span>
                        <input
                            type="search"
                            autoFocus
                            placeholder="Buscar por nome ou e-mail… (busca enquanto digita)"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            className="w-full border border-gray-300 rounded pl-10 pr-10 py-2 text-sm focus:border-rise-500 focus:ring-rise-500"
                        />
                        {q && (
                            <button
                                type="button"
                                onClick={() => setQ('')}
                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                                title="Limpar busca"
                            >
                                <i className="fa-solid fa-circle-xmark" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Bulk actions */}
                {selecionados.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-center justify-between">
                        <span className="text-sm text-blue-900">
                            <strong>{selecionados.length}</strong> usuário(s) selecionado(s)
                        </span>
                        <div className="flex gap-2">
                            <button onClick={bulkAtivar}
                                className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700">
                                <i className="fa-solid fa-check mr-1" /> Marcar como almoxarife
                            </button>
                            <button onClick={bulkDesativar}
                                className="px-3 py-1.5 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700">
                                <i className="fa-solid fa-xmark mr-1" /> Remover almoxarife
                            </button>
                            <button onClick={() => setSelecionados([])}
                                className="px-3 py-1.5 border border-gray-300 rounded text-xs hover:bg-white">
                                Limpar seleção
                            </button>
                        </div>
                    </div>
                )}

                {/* Lista */}
                <div className="bg-white rounded-lg shadow border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-left font-semibold text-gray-700">
                            <tr>
                                <th className="px-4 py-2 w-10">
                                    <input
                                        type="checkbox"
                                        checked={selecionados.length === users.filter((u) => !u.eh_super).length && users.length > 0}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelecionados(users.filter((u) => !u.eh_super).map((u) => u.id));
                                            } else {
                                                setSelecionados([]);
                                            }
                                        }}
                                        className="h-4 w-4 text-rise-600 rounded"
                                    />
                                </th>
                                <th className="px-4 py-2">Usuário</th>
                                <th className="px-4 py-2">Tipo</th>
                                <th className="px-4 py-2 text-center">Almoxarife em {empresaAtual?.nome_fantasia}?</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center text-gray-500 py-12">
                                        <i className="fa-solid fa-users text-3xl text-gray-300 mb-2 block" />
                                        Nenhum usuário encontrado.
                                    </td>
                                </tr>
                            ) : users.map((u) => (
                                <tr key={u.id} className={`hover:bg-gray-50 ${u.eh_super ? 'bg-amber-50/40' : ''}`}>
                                    <td className="px-4 py-2">
                                        <input
                                            type="checkbox"
                                            checked={selecionados.includes(u.id)}
                                            onChange={() => toggleSelecao(u.id)}
                                            disabled={u.eh_super}
                                            className="h-4 w-4 text-rise-600 rounded disabled:opacity-30"
                                        />
                                    </td>
                                    <td className="px-4 py-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-rise-100 text-rise-700 flex items-center justify-center font-bold text-xs">
                                                {u.name?.[0]?.toUpperCase() || '?'}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{u.name}</p>
                                                <p className="text-[11px] text-gray-500">{u.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2">
                                        <span className="text-[11px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-medium uppercase">
                                            {u.type || '—'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        {u.eh_super ? (
                                            <span className="bg-amber-100 text-amber-800 text-[11px] px-2 py-1 rounded-full font-medium">
                                                <i className="fa-solid fa-crown mr-1" />
                                                Super-admin (acesso total)
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => toggle(u, !u.eh_almoxarife)}
                                                className={`relative inline-flex items-center h-7 w-14 rounded-full transition ${
                                                    u.eh_almoxarife ? 'bg-emerald-500' : 'bg-gray-300'
                                                }`}
                                                title={u.eh_almoxarife ? 'Remover permissão' : 'Conceder permissão'}
                                            >
                                                <span
                                                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                                                        u.eh_almoxarife ? 'translate-x-8' : 'translate-x-1'
                                                    }`}
                                                />
                                                <span className={`absolute inset-0 flex items-center ${u.eh_almoxarife ? 'justify-start pl-1.5' : 'justify-end pr-1.5'} text-[9px] font-bold text-white pointer-events-none`}>
                                                    {u.eh_almoxarife ? 'SIM' : 'NÃO'}
                                                </span>
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-900">
                    <p className="font-semibold mb-1">
                        <i className="fa-solid fa-circle-info mr-1" /> Como funciona
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                        <li>Almoxarifes podem <strong>aprovar/rejeitar devoluções</strong> com a própria senha (módulo estoque.devolucoes, can_update).</li>
                        <li>A permissão é <strong>por empresa</strong> — troque o seletor acima para configurar outras.</li>
                        <li>Super-admins têm acesso total automaticamente e não aparecem como toggle.</li>
                        <li>Para gestão mais granular (can_list/view/create/delete) use /admin/users/:id/edit.</li>
                    </ul>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
