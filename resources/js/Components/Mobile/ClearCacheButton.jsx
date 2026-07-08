// resources/js/Components/Mobile/ClearCacheButton.jsx
// -----------------------------------------------------------------------------
// Botão "Limpar cache" de MÓDULO (por página): remove do IndexedDB apenas os
// registros JÁ SINCRONIZADOS do módulo/veículo atual — registros pendentes de
// envio são SEMPRE preservados (limpar cache nunca pode perder trabalho offline).
//
// Enquanto limpa, exibe overlay bloqueante com spinner (evita navegação/toques
// no meio da transação do Dexie).
//
// Props:
//   clearFn   : async () => void — função do repositório que limpa o módulo
//   onCleared : async () => void — recarrega a lista da página após limpar
// -----------------------------------------------------------------------------
import { useState } from 'react';
import { confirmDialog, alertDialog } from '@/utils/dialogs';

export default function ClearCacheButton({ clearFn, onCleared }) {
    const [clearing, setClearing] = useState(false);

    const handleClear = async () => {
        if (clearing) return;
        const ok = await confirmDialog({
            title: 'Limpar cache deste módulo?',
            text: 'Somente registros já sincronizados serão removidos. '
                + 'Registros pendentes de envio serão mantidos.',
            icon: 'warning',
            confirmText: 'Limpar',
            danger: true,
        });
        if (!ok) return;
        setClearing(true);
        try {
            await clearFn();
            await onCleared?.();
        } catch (e) {
            await alertDialog({
                title: 'Falha ao limpar o cache',
                text: e?.message || 'Erro desconhecido.',
                icon: 'error',
            });
        } finally {
            setClearing(false);
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={handleClear}
                disabled={clearing}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-red-50 text-red-600 border border-red-300 active:bg-red-100 disabled:opacity-50"
            >
                <i className="fa-solid fa-broom mr-1" /> Limpar cache
            </button>

            {/* Overlay bloqueante durante a limpeza */}
            {clearing && (
                <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center">
                    <div className="bg-white rounded-2xl px-6 py-5 flex flex-col items-center gap-3 shadow-xl mx-6">
                        <i className="fa-solid fa-spinner fa-spin text-3xl text-[#557bbb]" />
                        <p className="text-sm font-medium text-gray-700">Limpando cache…</p>
                        <p className="text-[11px] text-gray-400 text-center">
                            Registros pendentes de envio serão preservados.
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}
