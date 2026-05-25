// resources/js/utils/datetime.js
// -----------------------------------------------------------------------------
// Helpers de data/hora. Padrão America/Sao_Paulo (regra de negócio do app).
// Port do legado React Native.
// -----------------------------------------------------------------------------

const TZ = 'America/Sao_Paulo';

/**
 * Pad de 2 dígitos com zero à esquerda.
 */
function pad(n) {
    return String(n).padStart(2, '0');
}

/**
 * Retorna timestamp MySQL local (America/Sao_Paulo).
 * Ex: "2024-12-15 14:30:45"
 */
export function nowLocalTimestamp() {
    return toLocalTimestamp(new Date());
}

/**
 * Converte Date para timestamp MySQL local.
 */
export function toLocalTimestamp(d) {
    if (!d) return '';
    // Pega partes em São Paulo via Intl
    const parts = new Intl.DateTimeFormat('pt-BR', {
        timeZone: TZ,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
    }).formatToParts(d);
    const obj = Object.fromEntries(parts.map(p => [p.type, p.value]));
    return `${obj.year}-${obj.month}-${obj.day} ${obj.hour}:${obj.minute}:${obj.second}`;
}

/**
 * Retorna data/hora local no formato dd/mm/aaaa hh:mm
 * Ex: "15/12/2024 14:30"
 */
export function nowLocalDMYHM() {
    return toLocalDMYHM(new Date());
}

export function toLocalDMYHM(d) {
    if (!d) return '';
    const parts = new Intl.DateTimeFormat('pt-BR', {
        timeZone: TZ,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
        hour12: false,
    }).formatToParts(d);
    const obj = Object.fromEntries(parts.map(p => [p.type, p.value]));
    return `${obj.day}/${obj.month}/${obj.year} ${obj.hour}:${obj.minute}`;
}

/**
 * Formata um ISO date string como dd/mm/aaaa.
 */
export function formatDate(isoOrDate) {
    if (!isoOrDate || isoOrDate === '0000-00-00' || isoOrDate === '0000-00-00 00:00:00') return '--';
    try {
        const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
        const parts = new Intl.DateTimeFormat('pt-BR', {
            timeZone: TZ,
            year: 'numeric', month: '2-digit', day: '2-digit',
        }).formatToParts(d);
        const obj = Object.fromEntries(parts.map(p => [p.type, p.value]));
        return `${obj.day}/${obj.month}/${obj.year}`;
    } catch (_) {
        return '--';
    }
}

export default {
    nowLocalTimestamp,
    toLocalTimestamp,
    nowLocalDMYHM,
    toLocalDMYHM,
    formatDate,
};
