// resources/js/utils/dialogs.js
// -----------------------------------------------------------------------------
// Diálogos padronizados do app (SweetAlert2) — substituem alert()/confirm()
// nativos, que destoam do visual do PWA e não são estilizáveis.
//
// Uso:
//   const ok = await confirmDialog({ title: 'Limpar cache?', text: '…' });
//   await alertDialog({ title: 'Erro', text: e.message, icon: 'error' });
//   toast('Nada para sincronizar.');
//
// Bundle local (sem CDN) — funciona offline e entra no precache do SW.
// -----------------------------------------------------------------------------
import Swal from 'sweetalert2';

const BRAND = '#557bbb';
const DANGER = '#dc2626';

const base = Swal.mixin({
    confirmButtonColor: BRAND,
    cancelButtonColor: '#9ca3af',
    reverseButtons: true,   // padrão mobile: ação primária à direita
    heightAuto: false,      // não mexe no height do body (quebraria o layout PWA)
    customClass: {
        popup: 'rounded-2xl text-sm',
        title: 'text-lg',
        confirmButton: 'rounded-lg font-semibold',
        cancelButton: 'rounded-lg font-medium',
    },
});

/**
 * Confirmação (OK/Cancelar). Retorna Promise<boolean>.
 * Use `danger: true` para ações destrutivas (botão vermelho).
 * Aceita `html` para conteúdo com quebras de linha/listas.
 */
export async function confirmDialog({
    title,
    text = '',
    html = null,
    confirmText = 'OK',
    cancelText = 'Cancelar',
    icon = 'question',
    danger = false,
}) {
    const res = await base.fire({
        title,
        text: html ? undefined : text,
        html: html || undefined,
        icon,
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        confirmButtonColor: danger ? DANGER : BRAND,
    });
    return res.isConfirmed;
}

/** Aviso simples com botão OK. */
export function alertDialog({ title, text = '', icon = 'info', confirmText = 'OK' }) {
    return base.fire({ title, text, icon, confirmButtonText: confirmText });
}

// Toast discreto no topo (auto-fecha) — para mensagens informativas rápidas.
const toastMixin = Swal.mixin({
    toast: true,
    position: 'top',
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true,
});

export function toast(title, icon = 'info') {
    return toastMixin.fire({ title, icon });
}

export default { confirmDialog, alertDialog, toast };
