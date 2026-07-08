// resources/js/Components/Mobile/OpenCyclesBanner.jsx
// -----------------------------------------------------------------------------
// Banner persistente que avisa o motorista quando há ciclo (diário ou checklist)
// ABERTO em algum veículo. Aparece em todo o módulo Mobile via MobileLayout.
//
// Comportamento:
//   - Discreto quando não há ciclo aberto (não renderiza)
//   - Amarelo destacado quando há ciclo aberto
//   - Mostra qual veículo e tipo do ciclo
//   - CTA: "Ir agora" leva para a tela de fechamento
//   - Dispensável (X) — mas reaparece na próxima navegação
// -----------------------------------------------------------------------------

import { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import useOpenCycles from '@/offline/hooks/useOpenCycles';

export default function OpenCyclesBanner() {
    const { auth } = usePage().props;
    const userId = auth?.user?.id;
    const { openDiario } = useOpenCycles(userId);
    const [dismissed, setDismissed] = useState(false);

    if (dismissed) return null;
    if (!openDiario) return null;

    // Só o DIÁRIO tem ciclo — checklist virou cadastro único (2026-07-08).
    const cycles = [{
        kind: 'diario',
        icon: 'fa-book',
        label: 'Diário de Bordo',
        color: 'amber',
        prefixo: openDiario.prefixo,
        closeHref: `/mobile/veiculos/${openDiario.veiculo_id}/diario-bordo/${openDiario.id}/close`,
        indexHref: `/mobile/veiculos/${openDiario.veiculo_id}/diario-bordo`,
    }];

    return (
        <div className="bg-amber-50 border-b border-amber-200">
            {cycles.map((c) => (
                <div key={c.kind} className="px-3 py-2 flex items-center gap-2">
                    <i className={`fa-solid ${c.icon} text-amber-600 flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-amber-900 font-medium leading-tight">
                            {c.label} <strong>ABERTO</strong> em <strong>{c.prefixo}</strong>
                        </p>
                    </div>
                    <Link
                        href={c.closeHref}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold rounded-md whitespace-nowrap"
                    >
                        Ir agora
                    </Link>
                    <button
                        type="button"
                        onClick={() => setDismissed(true)}
                        className="w-6 h-6 flex items-center justify-center rounded text-amber-700 hover:bg-amber-100 flex-shrink-0"
                        aria-label="Dispensar"
                    >
                        <i className="fa-solid fa-xmark text-xs" />
                    </button>
                </div>
            ))}
        </div>
    );
}
