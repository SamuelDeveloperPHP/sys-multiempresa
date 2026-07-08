// resources/js/Pages/Mobile/Dashboard/Index.jsx
// -----------------------------------------------------------------------------
// Dashboard do motorista — visão consolidada dos próprios registros.
//
// Lê tudo do Dexie (offline-first). Os dados já vêm filtrados por usuário
// quando o sync online roda (backend filtra por id_user/user_create).
//
// KPIs:
//   - Abastecimentos: qtd, litros totais, valor total (R$)
//   - Diário de Bordo: abertos, fechados, horas trabalhadas
//   - Checklist: abertos, fechados
//
// Filtros de período: Hoje | Semana | Mês | Tudo
//
// Timeline: últimas N atividades ordenadas por data desc
// -----------------------------------------------------------------------------

import { useMemo, useState, useEffect } from 'react';
import { Link, Head, usePage } from '@inertiajs/react';
import { useLiveQuery } from 'dexie-react-hooks';
import MobileLayout from '@/Layouts/MobileLayout';
import db from '@/offline/db';
import useOnlineStatus from '@/offline/hooks/useOnlineStatus';
import { ToggleSwitch } from '@/Components/Mobile/NetworkStatusBar';
import abastecimentosRepo from '@/offline/repositories/abastecimentosRepo';
import diarioBordoRepo from '@/offline/repositories/diarioBordoRepo';
import checklistsRepo from '@/offline/repositories/checklistsRepo';
import { formatBRL, currencyToNumber } from '@/utils/numberInput';
import { formatMinutos, formatDate, parseDateFlex } from '@/utils/datetime';

// -----------------------------------------------------------------------------
// Períodos de filtro
// -----------------------------------------------------------------------------
const PERIODOS = [
    { key: 'hoje',    label: 'Hoje',    days: 0 },
    { key: 'semana',  label: '7 dias',  days: 7 },
    { key: 'mes',     label: '30 dias', days: 30 },
    { key: 'tudo',    label: 'Tudo',    days: null },
];

function periodoStart(period) {
    if (period.days === null) return null;       // sem filtro
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (period.days > 0) {
        d.setDate(d.getDate() - period.days);
    }
    return d;
}

function isInPeriod(dateStr, start) {
    if (!start) return true;
    const d = parseDateFlex(dateStr);
    if (!d) return false;
    return d.getTime() >= start.getTime();
}

// -----------------------------------------------------------------------------
// Componente principal
// -----------------------------------------------------------------------------
export default function DashboardIndex() {
    const { auth } = usePage().props;
    const user = auth?.user || {};
    const { online, deviceOffline, forcedOffline, setForcedOffline } = useOnlineStatus();
    const [periodKey, setPeriodKey] = useState('semana');
    const [syncing, setSyncing] = useState(false);

    const period = PERIODOS.find((p) => p.key === periodKey) || PERIODOS[1];
    const start = useMemo(() => periodoStart(period), [period]);

    // ---- Sincronização ao abrir (quando online) ----
    useEffect(() => {
        (async () => {
            if (!online) return;
            setSyncing(true);
            try {
                await Promise.allSettled([
                    abastecimentosRepo.syncAllRecent(),
                    diarioBordoRepo.syncAllRecent(),
                    checklistsRepo.syncAllRecentServicos(),
                ]);
            } finally {
                setSyncing(false);
            }
        })();
    }, [online]);

    // ---- Live queries (reativas via Dexie) ----
    const abastecimentos = useLiveQuery(
        () => db.abastecimentos.toArray(),
        [],
        []
    );
    const diarios = useLiveQuery(
        () => db.diario_bordo.toArray(),
        [],
        []
    );
    const checklists = useLiveQuery(
        () => db.checklist_servicos.toArray(),
        [],
        []
    );

    // ---- Filtra pelo período ----
    const abFiltered  = useMemo(() => abastecimentos.filter(r => isInPeriod(r.data || r.data_abastecimento, start)), [abastecimentos, start]);
    const diFiltered  = useMemo(() => diarios.filter(r => isInPeriod(r.data || r.data_cadastro, start)), [diarios, start]);
    const chFiltered  = useMemo(() => checklists.filter(r => isInPeriod(r.data || r.data_execucao, start)), [checklists, start]);

    // ---- KPIs ----
    const kpiAbastecimento = useMemo(() => {
        const litros = abFiltered.reduce((sum, r) => sum + (Number(r.quantidade) || 0), 0);
        const valor  = abFiltered.reduce((sum, r) => sum + (Number(r.valor_total) || 0), 0);
        return { qtd: abFiltered.length, litros, valor };
    }, [abFiltered]);

    const kpiDiario = useMemo(() => {
        const abertos  = diFiltered.filter(r => r.ciclo_status === 'ABERTO').length;
        const fechados = diFiltered.filter(r => r.ciclo_status === 'FECHADO').length;
        const minutos  = diFiltered.reduce((sum, r) => sum + (Number(r.horas_trabalhadas_minutos) || 0), 0);
        return { abertos, fechados, minutos };
    }, [diFiltered]);

    // Checklist é cadastro único (sem ciclo) — KPI é contagem simples.
    const kpiChecklist = useMemo(() => ({ qtd: chFiltered.length }), [chFiltered]);

    // ---- Timeline (últimas 10 atividades misturadas) ----
    const timeline = useMemo(() => {
        const all = [
            ...abFiltered.map(r => ({
                kind: 'abastecimento',
                id: r.id || r._local_id,
                veiculo_id: r.veiculo_id,
                date: r.data || r.data_abastecimento,
                title: `Abastecimento — ${(r.quantidade || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}L`,
                subtitle: r.fornecedor || r.combustivel || '',
                amount: r.valor_total,
                icon: 'fa-gas-pump',
                color: 'emerald',
            })),
            ...diFiltered.map(r => ({
                kind: 'diario',
                id: r.id || r._local_id,
                veiculo_id: r.veiculo_id,
                date: r.data || r.data_cadastro,
                title: r.ciclo_status === 'ABERTO' ? 'Diário aberto' : 'Diário fechado',
                subtitle: r.descricao_atividade || '',
                icon: 'fa-book',
                color: r.ciclo_status === 'ABERTO' ? 'amber' : 'blue',
            })),
            ...chFiltered.map(r => ({
                kind: 'checklist',
                id: r.id || r._local_id,
                veiculo_id: r.veiculo_id,
                date: r.data || r.data_execucao,
                title: 'Checklist',
                subtitle: r.template_nome || '',
                icon: 'fa-clipboard-check',
                color: 'indigo',
            })),
        ];
        // Ordena DESC por data e pega 10
        return all
            .filter(item => item.date)
            .sort((a, b) => {
                const da = parseDateFlex(a.date)?.getTime() || 0;
                const dbb = parseDateFlex(b.date)?.getTime() || 0;
                return dbb - da;
            })
            .slice(0, 10);
    }, [abFiltered, diFiltered, chFiltered]);

    const handleManualSync = async () => {
        if (!online || syncing) return;
        setSyncing(true);
        try {
            await Promise.allSettled([
                abastecimentosRepo.syncAllRecent(),
                diarioBordoRepo.syncAllRecent(),
                checklistsRepo.syncAllRecentServicos(),
            ]);
        } finally {
            setSyncing(false);
        }
    };

    return (
        <MobileLayout header="Dashboard">
            <Head title="Dashboard" />

            <div className="p-3 space-y-3">
                {/* Boas-vindas + status sync */}
                <div className="bg-gradient-to-br from-[#557bbb] to-[#3a5a8c] text-white rounded-2xl p-4 shadow-lg">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <p className="text-xs text-white/70 mb-0.5">Olá,</p>
                            <h2 className="text-lg font-bold truncate">
                                {(user.name || 'Motorista').split(' ')[0]}
                            </h2>
                            <p className="text-[11px] text-white/60 mt-1">
                                {online ? 'Conectado'
                                    : forcedOffline ? 'Modo offline (manual)'
                                    : 'Modo offline'}
                                {syncing && ' • Sincronizando…'}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleManualSync}
                            disabled={!online || syncing}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 disabled:opacity-50 transition-colors"
                            aria-label="Sincronizar"
                        >
                            <i className={`fa-solid fa-rotate ${syncing ? 'fa-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Toggle de conexão (arquitetura.md §8): controla o MODO do app
                    — não desliga o rádio do device. Com o modo offline ativo,
                    o app inteiro ignora a rede (sync, botões e banners já
                    respeitam o forcedOffline do useOnlineStatus). */}
                <div className={`rounded-xl p-3.5 shadow-sm border flex items-center gap-3 transition-colors ${
                    forcedOffline ? 'bg-slate-100 border-slate-300' : 'bg-white border-gray-100'
                }`}>
                    <div className={`w-10 h-10 flex items-center justify-center rounded-lg flex-shrink-0 ${
                        forcedOffline ? 'bg-slate-200 text-slate-600' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                        <i className={`fa-solid ${forcedOffline ? 'fa-wifi-slash' : 'fa-wifi'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">Trabalhar offline</p>
                        <p className="text-[11px] text-gray-500 leading-tight">
                            {forcedOffline
                                ? 'Internet ignorada — usando somente os dados do dispositivo.'
                                : deviceOffline
                                    ? 'Sem conexão real agora — o app já está usando os dados locais.'
                                    : 'Ative para o app parar de usar a internet (economiza dados e bateria).'}
                        </p>
                    </div>
                    <ToggleSwitch
                        value={forcedOffline}
                        onChange={() => setForcedOffline(!forcedOffline)}
                        ariaLabel="Trabalhar offline"
                    />
                </div>

                {/* Filtro de período */}
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {PERIODOS.map((p) => (
                        <button
                            key={p.key}
                            type="button"
                            onClick={() => setPeriodKey(p.key)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                                periodKey === p.key
                                    ? 'bg-[#557bbb] text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                {/* KPI: Abastecimento */}
                <Link
                    href="/mobile/abastecimentos"
                    className="block bg-white rounded-xl p-4 shadow-sm border-l-4 border-emerald-500 active:bg-gray-50"
                >
                    <div className="flex items-start gap-3">
                        <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-emerald-50 flex-shrink-0">
                            <i className="fa-solid fa-gas-pump text-xl text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Abastecimentos</p>
                                <i className="fa-solid fa-chevron-right text-gray-300 text-xs" />
                            </div>
                            <p className="text-2xl font-extrabold text-gray-900 mt-0.5">
                                {kpiAbastecimento.qtd}
                            </p>
                            <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500">
                                <span>
                                    <i className="fa-solid fa-droplet mr-1 text-emerald-500" />
                                    {kpiAbastecimento.litros.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L
                                </span>
                                <span className="text-emerald-700 font-semibold">
                                    {formatBRL(kpiAbastecimento.valor)}
                                </span>
                            </div>
                        </div>
                    </div>
                </Link>

                {/* KPI: Diário de Bordo */}
                <Link
                    href="/mobile/diario-bordo"
                    className="block bg-white rounded-xl p-4 shadow-sm border-l-4 border-blue-500 active:bg-gray-50"
                >
                    <div className="flex items-start gap-3">
                        <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-blue-50 flex-shrink-0">
                            <i className="fa-solid fa-book text-xl text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Diário de Bordo</p>
                                <i className="fa-solid fa-chevron-right text-gray-300 text-xs" />
                            </div>
                            <p className="text-2xl font-extrabold text-gray-900 mt-0.5">
                                {kpiDiario.abertos + kpiDiario.fechados}
                            </p>
                            <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500 flex-wrap">
                                {kpiDiario.abertos > 0 && (
                                    <span className="text-amber-700">
                                        <i className="fa-solid fa-flag mr-1" />
                                        {kpiDiario.abertos} aberto{kpiDiario.abertos > 1 ? 's' : ''}
                                    </span>
                                )}
                                <span className="text-blue-700">
                                    <i className="fa-solid fa-flag-checkered mr-1" />
                                    {kpiDiario.fechados} fechado{kpiDiario.fechados !== 1 ? 's' : ''}
                                </span>
                                {kpiDiario.minutos > 0 && (
                                    <span className="text-gray-700 font-semibold">
                                        <i className="fa-solid fa-clock mr-1 text-blue-500" />
                                        {formatMinutos(kpiDiario.minutos)} trabalhados
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </Link>

                {/* KPI: Checklist */}
                <Link
                    href="/mobile/checklists"
                    className="block bg-white rounded-xl p-4 shadow-sm border-l-4 border-indigo-500 active:bg-gray-50"
                >
                    <div className="flex items-start gap-3">
                        <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-indigo-50 flex-shrink-0">
                            <i className="fa-solid fa-clipboard-check text-xl text-indigo-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Checklists</p>
                                <i className="fa-solid fa-chevron-right text-gray-300 text-xs" />
                            </div>
                            <p className="text-2xl font-extrabold text-gray-900 mt-0.5">
                                {kpiChecklist.qtd}
                            </p>
                            <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500">
                                <span className="text-indigo-700">
                                    <i className="fa-solid fa-clipboard-check mr-1" />
                                    registro{kpiChecklist.qtd !== 1 ? 's' : ''} no período
                                </span>
                            </div>
                        </div>
                    </div>
                </Link>

                {/* Timeline de atividades recentes */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-gray-900">Atividades recentes</h3>
                        <span className="text-[10px] text-gray-400">{timeline.length} de {abFiltered.length + diFiltered.length + chFiltered.length}</span>
                    </div>

                    {timeline.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            <i className="fa-solid fa-inbox text-3xl mb-2 opacity-40" />
                            <p className="text-xs">Sem atividades neste período.</p>
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {timeline.map((item) => (
                                <TimelineItem key={`${item.kind}-${item.id}`} item={item} />
                            ))}
                        </ul>
                    )}
                </div>

                {/* Footer info */}
                <p className="text-[10px] text-gray-400 text-center pt-2">
                    <i className="fa-solid fa-circle-info mr-1" />
                    Dados sincronizados localmente. Toque em sincronizar para atualizar.
                </p>
            </div>
        </MobileLayout>
    );
}

// -----------------------------------------------------------------------------
// Item da timeline
// -----------------------------------------------------------------------------
function TimelineItem({ item }) {
    const colorMap = {
        emerald: 'bg-emerald-50 text-emerald-600',
        blue:    'bg-blue-50 text-blue-600',
        indigo:  'bg-indigo-50 text-indigo-600',
        amber:   'bg-amber-50 text-amber-700',
    };
    const linkMap = {
        abastecimento: `/mobile/veiculos/${item.veiculo_id}/abastecimentos`,
        diario:        `/mobile/veiculos/${item.veiculo_id}/diario-bordo`,
        checklist:     `/mobile/veiculos/${item.veiculo_id}/checklist`,
    };

    return (
        <li>
            <Link
                href={linkMap[item.kind] || '#'}
                className="flex items-center gap-3 py-2 hover:bg-gray-50 rounded-lg -mx-2 px-2 transition-colors"
            >
                <div className={`w-9 h-9 flex items-center justify-center rounded-lg flex-shrink-0 ${colorMap[item.color] || 'bg-gray-100 text-gray-500'}`}>
                    <i className={`fa-solid ${item.icon} text-sm`} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-gray-800 truncate">{item.title}</p>
                    {item.subtitle && (
                        <p className="text-[11px] text-gray-500 truncate">{item.subtitle}</p>
                    )}
                </div>
                <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-gray-400">{formatDate(item.date)}</p>
                    {item.amount != null && (
                        <p className="text-[11px] font-semibold text-emerald-600">{formatBRL(item.amount)}</p>
                    )}
                </div>
            </Link>
        </li>
    );
}
