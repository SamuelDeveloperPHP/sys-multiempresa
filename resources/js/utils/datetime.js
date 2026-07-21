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
 * Formata um datetime de NEGÓCIO (hora local de SP) como "DD/MM/YYYY, HH:MM:SS",
 * lendo os DÍGITOS diretamente — SEM conversão de fuso. Aceita "Y-M-D H:M:S",
 * ISO "Y-M-DTH:M:S(.fff)(Z|+00:00)" etc.
 *
 * Por que existe: o servidor devolve datas locais (data_abastecimento, etc.)
 * rotuladas como UTC (+00:00). new Date(x).toLocaleString() converte de novo e
 * mostra -3h. Como a convenção do app é "hora local de SP em todo datetime de
 * negócio", exibimos os dígitos como estão. Também evita divergência de parsing
 * entre navegadores (iOS trata "Y-M-D H:M:S" como UTC).
 */
export function formatWallClock(value) {
    if (!value) return '—';
    const m = String(value).match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (!m) return '—';
    const [, y, mo, d, h, mi, se] = m;
    return `${d}/${mo}/${y}, ${h}:${mi}:${se || '00'}`;
}

/**
 * Valor para <input type="datetime-local"> a partir de um datetime de negócio,
 * lendo os dígitos (sem conversão de fuso). Retorna "YYYY-MM-DDTHH:MM".
 */
export function toDatetimeLocalValue(value) {
    if (!value) return '';
    const m = String(value).match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
    return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}` : '';
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

/**
 * Calcula a diferença entre duas datas/horários em MINUTOS.
 * Aceita formatos: timestamp MySQL ("YYYY-MM-DD HH:mm:ss"), ISO 8601, ou
 * dd/mm/aaaa hh:mm (formato BR). Retorna 0 se entrada inválida ou diff <= 0.
 *
 * Usado em diário de bordo para calcular horas_trabalhadas_minutos.
 *
 * @param {string|Date} inicio
 * @param {string|Date} fim
 * @returns {number} minutos de diferença (>=0)
 */
export function diffMinutos(inicio, fim) {
    const di = parseDateFlex(inicio);
    const df = parseDateFlex(fim);
    if (!di || !df) return 0;
    const diffMs = df.getTime() - di.getTime();
    if (diffMs <= 0) return 0;
    return Math.floor(diffMs / 60000);
}

/**
 * Parser flexível — aceita Date, ISO, MySQL timestamp ou pt-BR dd/mm/aaaa hh:mm.
 */
export function parseDateFlex(input) {
    if (!input) return null;
    if (input instanceof Date) return input;
    const s = String(input).trim();
    // Formato pt-BR: dd/mm/aaaa hh:mm
    const brMatch = s.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
    if (brMatch) {
        const [, d, m, y, hh, mm] = brMatch;
        return new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), 0);
    }
    // Tenta parsing nativo (ISO, MySQL timestamp, etc.)
    const d = new Date(s.replace(' ', 'T'));
    return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Formata minutos em "Xh Ymin" (ex: 125 → "2h 5min").
 */
export function formatMinutos(min) {
    const m = Number(min) || 0;
    if (m < 60) return `${m}min`;
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r > 0 ? `${h}h ${r}min` : `${h}h`;
}

export default {
    nowLocalTimestamp,
    toLocalTimestamp,
    nowLocalDMYHM,
    toLocalDMYHM,
    formatWallClock,
    toDatetimeLocalValue,
    formatDate,
    diffMinutos,
    parseDateFlex,
    formatMinutos,
};
