// resources/js/Pages/Mobile/Veiculos/Index.jsx
// -----------------------------------------------------------------------------
// Lista de veículos — offline-first.
// Estratégia (mesma do app React Native):
//   1) Tenta sincronizar do servidor (se online).
//   2) Sempre lê do cache local (Dexie) — instantâneo, mesmo sem internet.
//   3) Busca por prefixo/placa/marca/modelo via filter local.
// -----------------------------------------------------------------------------

import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, Head } from '@inertiajs/react';
import MobileLayout from '@/Layouts/MobileLayout';
import veiculosRepo from '@/offline/repositories/veiculosRepo';
import useOnlineStatus from '@/offline/hooks/useOnlineStatus';

export default function VeiculosIndex() {
    const { online } = useOnlineStatus();
    const [searchQuery, setSearchQuery] = useState('');
    const [veiculos, setVeiculos] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState(null);
    const [lastSyncCount, setLastSyncCount] = useState(null);
    const searchTimer = useRef(null);

    // ---- carrega do cache ----
    const loadFromCache = useCallback(async (q = '', p = 0, append = false) => {
        setLoading(true);
        setError(null);
        try {
            const result = await veiculosRepo.list({ query: q, page: p });
            setVeiculos((prev) => append ? [...prev, ...result.items] : result.items);
            setTotal(result.total);
            setPage(result.page);
            setHasMore(result.hasMore);
        } catch (err) {
            setError(err.message || 'Erro ao carregar do cache.');
        } finally {
            setLoading(false);
        }
    }, []);

    // ---- sincroniza do servidor (puxa lista atualizada) ----
    const syncNow = useCallback(async () => {
        if (!online) return;
        setSyncing(true);
        try {
            const count = await veiculosRepo.syncFromServer();
            setLastSyncCount(count);
            await loadFromCache(searchQuery, 0, false);
        } catch (err) {
            setError('Falha ao sincronizar com o servidor — exibindo cache local.');
        } finally {
            setSyncing(false);
        }
    }, [online, loadFromCache, searchQuery]);

    // ---- mount: sincroniza (se online) e carrega cache ----
    useEffect(() => {
        (async () => {
            await loadFromCache('', 0, false);
            if (online) {
                await syncNow();
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ---- search com debounce de 400ms (sempre do cache, nunca online) ----
    const handleSearch = (text) => {
        setSearchQuery(text);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            loadFromCache(text, 0, false);
        }, 400);
    };

    const loadMore = () => {
        if (!loading && hasMore) {
            loadFromCache(searchQuery, page + 1, true);
        }
    };

    const baseImageUrl = 'https://sga-engeativos.com.br/imagens/veiculos';

    return (
        <MobileLayout header="Veículos">
            <Head title="Veículos - Mobile" />

            <div className="p-3 space-y-3">
                {/* Search */}
                <div className="relative">
                    <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder="Buscar prefixo, placa, marca…"
                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#557bbb] focus:ring-1 focus:ring-[#557bbb]"
                        autoCapitalize="characters"
                    />
                </div>

                {/* Status bar */}
                <div className="flex items-center justify-between text-[12px] text-gray-500">
                    <span>
                        <strong className="text-gray-700">{total}</strong> veículo(s){searchQuery ? ` para "${searchQuery}"` : ''}
                    </span>
                    {syncing && (
                        <span className="text-[#557bbb]">
                            <i className="fa-solid fa-rotate fa-spin mr-1" />
                            Sincronizando…
                        </span>
                    )}
                    {!syncing && online && (
                        <button
                            onClick={syncNow}
                            className="text-[#557bbb] font-medium hover:underline"
                        >
                            <i className="fa-solid fa-rotate mr-1" />
                            Atualizar
                        </button>
                    )}
                </div>

                {error && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-2 text-xs">
                        <i className="fa-solid fa-triangle-exclamation mr-1" />
                        {error}
                    </div>
                )}

                {/* Lista */}
                {loading && veiculos.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <i className="fa-solid fa-spinner fa-spin text-2xl mb-2" />
                        <p className="text-sm">Carregando…</p>
                    </div>
                ) : veiculos.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <i className="fa-solid fa-truck text-3xl mb-2" />
                        <p className="text-sm">Nenhum veículo encontrado{searchQuery ? ` para "${searchQuery}"` : ''}.</p>
                        {!online && (
                            <p className="text-xs mt-2 text-red-600">
                                Você está offline e o cache local está vazio.
                            </p>
                        )}
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {veiculos.map((v) => (
                            <li key={v.id}>
                                <Link
                                    href={`/mobile/veiculos/${v.id}`}
                                    className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm border border-gray-100 active:bg-gray-50"
                                >
                                    <img
                                        src={
                                            v.imagem
                                                ? `${baseImageUrl}/${v.id}/${v.imagem}`
                                                : '/icons/no-photo.svg'
                                        }
                                        alt={v.prefixo}
                                        className="w-20 h-14 object-cover rounded-md bg-gray-100 flex-shrink-0"
                                        onError={(e) => { e.target.src = '/icons/no-photo.svg'; }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-base">{v.tipo == 4 ? '🚜' : '🚛'}</span>
                                            <span className="font-bold text-gray-800 text-sm truncate">{v.prefixo}</span>
                                        </div>
                                        <p className="text-xs text-gray-600 truncate">
                                            🏷️ {v.marca || '—'} {v.modelo ? `— ${v.modelo}` : ''}
                                        </p>
                                        {v.placa && (
                                            <p className="text-[11px] text-gray-500">Placa: {v.placa}</p>
                                        )}
                                    </div>
                                    <i className="fa-solid fa-chevron-right text-gray-300 text-xs" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}

                {hasMore && (
                    <button
                        onClick={loadMore}
                        disabled={loading}
                        className="w-full py-2.5 text-sm text-[#557bbb] font-medium hover:bg-gray-50 rounded-lg"
                    >
                        {loading ? 'Carregando…' : 'Ver mais'}
                    </button>
                )}
            </div>
        </MobileLayout>
    );
}
