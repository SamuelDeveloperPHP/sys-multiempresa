// resources/js/Components/BiometriaPolicyBanner.jsx
// -----------------------------------------------------------------------------
// Banner global de política de biometria. Aparece no topo do
// AuthenticatedLayout quando o usuário tem < 2 credenciais WebAuthn.
//
// Dismissível por sessão (sessionStorage). Quando user fechar, não aparece
// mais até abrir o browser de novo. CTA leva direto para /admin/perfil/biometria.
// -----------------------------------------------------------------------------

import { useState, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';

const DISMISS_KEY = 'sga_biometria_banner_dismissed';

export default function BiometriaPolicyBanner() {
    const { auth } = usePage().props;
    const status = auth?.biometric_status;
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        try {
            setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1');
        } catch (_) { /* ignore */ }
    }, []);

    // Não mostra se: usuário deslogado, atende requisito, ou já fechou nesta sessão
    if (!auth?.user || !status || status.atende_requisito || dismissed) {
        return null;
    }

    const fechar = () => {
        try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch (_) { /* ignore */ }
        setDismissed(true);
    };

    const isZero = status.total === 0;

    return (
        <div className={`${isZero ? 'bg-red-50 border-red-300 text-red-900' : 'bg-amber-50 border-amber-300 text-amber-900'} border-b-2 px-4 py-3`}>
            <div className="max-w-7xl mx-auto flex items-center gap-3">
                <i className={`fa-solid fa-fingerprint text-xl ${isZero ? 'text-red-600' : 'text-amber-600'} shrink-0`} />

                <div className="flex-1 text-sm">
                    {isZero ? (
                        <>
                            <strong>Política de segurança:</strong> você ainda não cadastrou
                            <strong> nenhuma biometria</strong>. Cadastre <strong>2 digitais</strong> para
                            usar biometria nas retiradas de estoque (redundância obrigatória).
                        </>
                    ) : (
                        <>
                            <strong>Falta 1 biometria!</strong> Você tem apenas <strong>{status.total} digital cadastrada</strong>.
                            Política da empresa exige <strong>≥ 2</strong> (se um dedo machucar/sujar, o outro funciona).
                        </>
                    )}
                </div>

                <Link
                    href="/admin/perfil/biometria"
                    className={`text-xs font-semibold px-3 py-1.5 rounded shadow-sm text-white shrink-0 ${
                        isZero ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
                    }`}
                >
                    <i className="fa-solid fa-arrow-right mr-1" />
                    Cadastrar agora
                </Link>

                <button
                    type="button" onClick={fechar}
                    title="Fechar (volta na próxima sessão)"
                    className={`px-2 py-1 rounded text-xs ${isZero ? 'hover:bg-red-100' : 'hover:bg-amber-100'} shrink-0`}
                >
                    <i className="fa-solid fa-xmark" />
                </button>
            </div>
        </div>
    );
}
