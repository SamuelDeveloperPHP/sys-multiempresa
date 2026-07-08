// resources/js/Pages/Mobile/Veiculos/Show.jsx
// -----------------------------------------------------------------------------
// Detalhe do veículo: dados básicos, atalhos para sub-recursos
// (Abastecimento / Diário / Checklist), Dashboard de Preventivas.
// -----------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { Link, Head } from '@inertiajs/react';
import MobileLayout from '@/Layouts/MobileLayout';
import veiculosRepo from '@/offline/repositories/veiculosRepo';
import useOnlineStatus from '@/offline/hooks/useOnlineStatus';

export default function VeiculoShow({ veiculoId }) {
    const { online } = useOnlineStatus();
    const [data, setData] = useState(null);
    const [preventivas, setPreventivas] = useState([]);
    const [medicaoAtual, setMedicaoAtual] = useState(0);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState(null);

    const id = veiculoId || (typeof window !== 'undefined'
        ? window.location.pathname.split('/').pop()
        : null);

    const loadFromCache = useCallback(async () => {
        const cached = await veiculosRepo.find(id);
        if (cached?.veiculo) {
            const med = cached.veiculo.tipo_hr == 1
                ? Number(cached.veiculo.horimetro_atual || 0)
                : Number(cached.veiculo.quilometragem_atual || 0);
            setData(cached);
            setMedicaoAtual(med);
            setPreventivas(veiculosRepo.processarPreventivas(
                cached.veiculo,
                cached.preventivas_itens,
                cached.servicos_preventiva,
                med
            ));
        }
    }, [id]);

    const syncNow = useCallback(async () => {
        if (!online || !id) return;
        setSyncing(true);
        try {
            const fresh = await veiculosRepo.syncOne(id);
            const med = fresh.medicaoAtual ?? (fresh.veiculo?.tipo_hr == 1
                ? Number(fresh.veiculo?.horimetro_atual || 0)
                : Number(fresh.veiculo?.quilometragem_atual || 0));
            setData(fresh);
            setMedicaoAtual(med);
            setPreventivas(veiculosRepo.processarPreventivas(
                fresh.veiculo,
                fresh.preventivas_itens,
                fresh.servicos_preventiva,
                med
            ));
        } catch (err) {
            setError('Não foi possível sincronizar agora — exibindo dados em cache.');
        } finally {
            setSyncing(false);
        }
    }, [online, id]);

    useEffect(() => {
        (async () => {
            setLoading(true);
            await loadFromCache();
            setLoading(false);
            if (online) await syncNow();
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    if (loading) {
        return (
            <MobileLayout header="Carregando…">
                <div className="text-center py-12 text-gray-400">
                    <i className="fa-solid fa-spinner fa-spin text-2xl mb-2" />
                </div>
            </MobileLayout>
        );
    }

    if (!data?.veiculo) {
        return (
            <MobileLayout header="Veículo não encontrado">
                <div className="p-4 text-center text-gray-500">
                    <i className="fa-solid fa-truck text-3xl mb-3" />
                    <p>Veículo não disponível no cache local.</p>
                    {!online && (
                        <p className="text-xs mt-2 text-red-600">
                            Conecte-se à internet e atualize a lista de veículos.
                        </p>
                    )}
                    <Link href="/mobile/veiculos" className="inline-block mt-4 px-4 py-2 bg-[#557bbb] text-white rounded-lg text-sm">
                        Voltar para a lista
                    </Link>
                </div>
            </MobileLayout>
        );
    }

    const v = data.veiculo;
    const isMaquina = v.tipo_hr == 1;
    const baseImageUrl = 'https://sga-engeativos.com.br/imagens/veiculos';

    return (
        <MobileLayout header={v.prefixo} backUrl="/mobile/veiculos">
            <Head title={`Veículo ${v.prefixo}`} />

            <div className="p-3 space-y-3">
                {error && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-2 text-xs">
                        <i className="fa-solid fa-triangle-exclamation mr-1" />
                        {error}
                    </div>
                )}

                {/* Foto + dados */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <img
                        src={
                            v.imagem
                                ? `${baseImageUrl}/${v.id}/${v.imagem}`
                                : '/imagens/icons/no-photo.svg'
                        }
                        alt={v.prefixo}
                        className="w-full h-48 object-cover bg-gray-100"
                        onError={(e) => { e.target.src = '/imagens/icons/no-photo.svg'; }}
                    />
                    <div className="p-3 space-y-1">
                        <div className="flex items-center justify-between">
                            <h2 className="font-bold text-lg text-gray-800">
                                {v.tipo == 4 ? '🚜' : '🚛'} {v.prefixo}
                            </h2>
                            {syncing && (
                                <i className="fa-solid fa-rotate fa-spin text-[#557bbb] text-xs" />
                            )}
                        </div>
                        <Field label="Placa / Série" value={v.placa || v.nun_serie_chassi || '—'} />
                        <Field label="Marca" value={v.marca || '—'} />
                        <Field label="Modelo" value={v.modelo || '—'} />
                        <Field label={isMaquina ? 'Horímetro atual' : 'KM atual'} value={Number(medicaoAtual).toLocaleString('pt-BR')} />
                    </div>
                </div>

                {/* Atalhos */}
                <div className="grid grid-cols-3 gap-2">
                    <ServiceCard
                        href={`/mobile/veiculos/${v.id}/abastecimentos`}
                        icon="fa-gas-pump"
                        color="#e67e22"
                        label="Abastecimento"
                    />
                    <ServiceCard
                        href={`/mobile/veiculos/${v.id}/diario-bordo`}
                        icon="fa-book"
                        color="#2ecc71"
                        label="Diário"
                    />
                    <ServiceCard
                        href={`/mobile/veiculos/${v.id}/checklist`}
                        icon="fa-clipboard-check"
                        color="#0057a3"
                        label="Checklist"
                    />
                </div>

                {/* Dashboard de Preventivas */}
                <div className="bg-white rounded-xl shadow-sm p-3">
                    <h3 className="text-sm font-semibold text-[#557bbb] mb-2">
                        <i className="fa-solid fa-wrench mr-1.5" />
                        Dashboard de Preventivas
                    </h3>

                    {!online && (
                        <p className="text-[11px] text-gray-500 italic text-center py-1">
                            Exibindo dados em cache (offline).
                        </p>
                    )}

                    {preventivas.length === 0 ? (
                        <p className="text-center text-xs text-gray-400 py-4">
                            Nenhuma preventiva cadastrada.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {preventivas.map((p, i) => (
                                <PreventivaCard
                                    key={i}
                                    prev={p}
                                    isMaquina={isMaquina}
                                    medAtual={medicaoAtual}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </MobileLayout>
    );
}

function Field({ label, value }) {
    return (
        <div className="flex items-baseline gap-2 text-sm">
            <span className="text-gray-500 w-28 flex-shrink-0">{label}:</span>
            <span className="font-medium text-gray-800 truncate">{value}</span>
        </div>
    );
}

function ServiceCard({ href, icon, color, label }) {
    return (
        <Link
            href={href}
            className="flex flex-col items-center justify-center bg-white rounded-xl border-t-4 shadow-sm p-3 active:scale-95 transition-transform"
            style={{ borderTopColor: color }}
        >
            <i className={`fa-solid ${icon} text-2xl mb-1`} style={{ color }} />
            <span className="text-[11px] font-medium text-gray-700 text-center">{label}</span>
        </Link>
    );
}

function PreventivaCard({ prev, isMaquina, medAtual }) {
    const vencido = prev.distancia < 0;
    const liberado = prev.liberado;
    return (
        <div className="border-t-4 rounded-lg bg-white shadow-sm p-3" style={{ borderTopColor: prev.cor }}>
            <div className="flex items-start justify-between mb-2">
                <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase">
                        Ciclo {prev.periodo.toLocaleString('pt-BR')} {isMaquina ? 'HR' : 'KM'}
                    </p>
                    <p className="text-lg font-bold" style={{ color: prev.cor }}>
                        {vencido ? 'Vencido' : liberado ? 'Próximo!' : prev.distancia.toLocaleString('pt-BR')}
                        {!vencido && !liberado && (
                            <span className="text-[10px] font-normal text-gray-500 ml-1">
                                {isMaquina ? 'hr faltantes' : 'km faltantes'}
                            </span>
                        )}
                    </p>
                </div>
                <div
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: prev.cor + '20' }}
                >
                    <i className={`fa-solid ${vencido ? 'fa-triangle-exclamation' : liberado ? 'fa-check-double' : 'fa-wrench'} text-sm`} style={{ color: prev.cor }} />
                </div>
            </div>

            <div className="mb-2">
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${prev.progresso}%`, backgroundColor: prev.cor }} />
                </div>
                <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                    <span>Atual: {Number(medAtual).toLocaleString('pt-BR')}</span>
                    <span>Target: {Number(prev.alvo).toLocaleString('pt-BR')}</span>
                </div>
            </div>

            <div className="border-t border-gray-100 pt-2 grid grid-cols-2 gap-1 text-[11px]">
                <div>
                    <span className="text-gray-500">Última: </span>
                    <span className="font-medium text-gray-700">{prev.dataUltima}</span>
                </div>
                <div>
                    <span className="text-gray-500">Vence: </span>
                    <span className="font-medium text-gray-700">{prev.dataVencimento}</span>
                </div>
            </div>

            {!liberado && prev.textoBloqueio && (
                <div className="mt-2 bg-gray-50 border border-gray-200 rounded text-[11px] text-gray-600 px-2 py-1.5 flex items-center justify-center gap-1.5">
                    <i className="fa-solid fa-lock text-gray-400" />
                    <span>{prev.textoBloqueio}</span>
                </div>
            )}
        </div>
    );
}
