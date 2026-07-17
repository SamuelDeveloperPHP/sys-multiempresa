// resources/js/Pages/Mobile/Veiculos/Index.jsx
// -----------------------------------------------------------------------------
// Lista de veículos — UX portada do legado React Native.
//
// PRINCIPAIS DIFERENÇAS DA VERSÃO ANTERIOR:
//   - Lista INICIA VAZIA (não mostra nada até o motorista buscar)
//   - Botão grande "Escanear QR/OCR" no topo abre scanner full-screen
//   - QR Code scanner (qualquer formato: QR, ean13, code-128, code-39)
//   - OCR scanner que reconhece prefixos no formato XX-NNN ou XXX-NNN
//   - Campo de busca read-only que mostra o resultado do scanner
//   - Pull-to-refresh manual (botão "Atualizar")
//
// OFFLINE-FIRST:
//   - Lê SEMPRE do Dexie via veiculosRepo.list()
//   - Sync online via veiculosRepo.syncFromServer() apenas no mount + ao refrescar
// -----------------------------------------------------------------------------

import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, Head } from '@inertiajs/react';
import MobileLayout from '@/Layouts/MobileLayout';
import veiculosRepo from '@/offline/repositories/veiculosRepo';
import useOnlineStatus from '@/offline/hooks/useOnlineStatus';
import QRCodeOCRScanner from '@/Components/Mobile/QRCodeOCRScanner';

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
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scanFeedback, setScanFeedback] = useState(null);
    const searchTimer = useRef(null);

    // ---- Carrega do cache (Dexie) ----
    const loadFromCache = useCallback(async (q = '', p = 0, append = false) => {
        if (!q.trim()) {
            // Lista vazia quando não há busca (UX do legado)
            setVeiculos([]);
            setTotal(0);
            setPage(0);
            setHasMore(false);
            return;
        }
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

    // ---- Sincroniza do servidor (popula Dexie) ----
    const syncNow = useCallback(async () => {
        if (!online) return;
        setSyncing(true);
        try {
            await veiculosRepo.syncFromServer();
        } catch (err) {
            console.warn('[Veiculos] sync falhou:', err.message);
        } finally {
            setSyncing(false);
        }
    }, [online]);

    // ---- Mount: só sincroniza, não exibe lista ainda ----
    useEffect(() => {
        if (online) {
            syncNow();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ---- Busca com debounce 400ms ----
    const handleSearchManual = (text) => {
        setSearchQuery(text);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            loadFromCache(text, 0, false);
        }, 400);
    };

    // ---- Resultado do Scanner (QR ou OCR) ----
    const handleScannerResult = (text, modeUsed) => {
        const cleaned = String(text || '').trim();
        if (!cleaned) return;
        setSearchQuery(cleaned);
        setScanFeedback({
            text: cleaned,
            mode: modeUsed,
            timestamp: Date.now(),
        });
        loadFromCache(cleaned, 0, false);
        // Feedback some após 4s
        setTimeout(() => setScanFeedback(null), 4000);
    };

    const loadMore = () => {
        if (!loading && hasMore) {
            loadFromCache(searchQuery, page + 1, true);
        }
    };

    const handleRefresh = async () => {
        await syncNow();
        if (searchQuery.trim()) {
            await loadFromCache(searchQuery, 0, false);
        }
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        setVeiculos([]);
        setTotal(0);
        setScanFeedback(null);
    };

    const baseImageUrl = 'https://sga-engeativos.com.br/imagens/veiculos';

    return (
        <MobileLayout header="Veículos">
            <Head title="Veículos - Mobile" />

            <div className="p-3 space-y-3">
                {/* Botão grande de Scanner */}
                <button
                    type="button"
                    onClick={() => setScannerOpen(true)}
                    className="w-full bg-[#557bbb] hover:bg-[#3a5a8c] active:scale-[0.98] text-white font-bold py-4 px-4 rounded-xl shadow-lg shadow-[#557bbb]/30 flex items-center justify-center gap-3 transition-all"
                >
                    <i className="fa-solid fa-camera text-2xl" />
                    <span className="text-base">Escanear Veículo</span>
                </button>

                {/* Campo somente leitura mostrando resultado do scanner / busca */}
                <div className="relative">
                    <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearchManual(e.target.value.toUpperCase())}
                        placeholder="Digite ou escaneie o prefixo…"
                        className="w-full pl-9 pr-9 py-3 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#557bbb] focus:ring-1 focus:ring-[#557bbb] text-center uppercase font-mono"
                        autoCapitalize="characters"
                        spellCheck={false}
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={handleClearSearch}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-200"
                            aria-label="Limpar busca"
                        >
                            <i className="fa-solid fa-xmark text-xs" />
                        </button>
                    )}
                </div>

                {/* Feedback do scanner (OCR) */}
                {scanFeedback && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-2 text-xs flex items-center gap-2">
                        <i className="fa-solid fa-font text-emerald-600" />
                        <span>
                            Prefixo lido: <strong>{scanFeedback.text}</strong>
                        </span>
                    </div>
                )}

                {/* Status bar */}
                {searchQuery && (
                    <div className="flex items-center justify-between text-[12px] text-gray-500">
                        <span>
                            <strong className="text-gray-700">{total}</strong> veículo(s) para "{searchQuery}"
                        </span>
                        {syncing ? (
                            <span className="text-[#557bbb]">
                                <i className="fa-solid fa-rotate fa-spin mr-1" />
                                Sincronizando…
                            </span>
                        ) : online && (
                            <button
                                type="button"
                                onClick={handleRefresh}
                                className="text-[#557bbb] font-medium hover:underline"
                            >
                                <i className="fa-solid fa-rotate mr-1" />
                                Atualizar
                            </button>
                        )}
                    </div>
                )}

                {error && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-2 text-xs">
                        <i className="fa-solid fa-triangle-exclamation mr-1" />
                        {error}
                    </div>
                )}

                {/* Estado: vazio inicial (sem busca) */}
                {!searchQuery && !loading && (
                    <div className="text-center py-16 text-gray-400">
                        <i className="fa-solid fa-camera text-5xl mb-4 text-[#557bbb]/30" />
                        <p className="text-sm font-medium">Escaneie ou digite o prefixo do veículo.</p>
                        <p className="text-xs mt-2 text-gray-400">
                            Use o botão acima para ler o prefixo pela câmera (ex: AC-001), ou digite no campo.
                        </p>
                    </div>
                )}

                {/* Estado: buscando */}
                {searchQuery && loading && veiculos.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                        <i className="fa-solid fa-spinner fa-spin text-2xl mb-2" />
                        <p className="text-sm">Buscando…</p>
                    </div>
                )}

                {/* Estado: nada encontrado */}
                {searchQuery && !loading && veiculos.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                        <i className="fa-solid fa-truck text-3xl mb-2" />
                        <p className="text-sm">Nenhum veículo encontrado para "{searchQuery}".</p>
                        {!online && (
                            <p className="text-xs mt-2 text-red-600">
                                Você está offline. Tente sincronizar quando voltar online.
                            </p>
                        )}
                    </div>
                )}

                {/* Lista */}
                {veiculos.length > 0 && (
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
                                                : '/imagens/icons/no-photo.svg'
                                        }
                                        alt={v.prefixo}
                                        className="w-20 h-14 object-cover rounded-md bg-gray-100 flex-shrink-0"
                                        onError={(e) => { e.target.src = '/imagens/icons/no-photo.svg'; }}
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
                        type="button"
                        onClick={loadMore}
                        disabled={loading}
                        className="w-full py-2.5 text-sm text-[#557bbb] font-medium hover:bg-gray-50 rounded-lg"
                    >
                        {loading ? 'Carregando…' : 'Ver mais'}
                    </button>
                )}
            </div>

            {/* Scanner full-screen */}
            <QRCodeOCRScanner
                isOpen={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onResult={handleScannerResult}
            />
        </MobileLayout>
    );
}
