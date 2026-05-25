// resources/js/utils/numberInput.js
// -----------------------------------------------------------------------------
// Helpers de máscara/normalização numéricos.
// Port direto do app legado (engeativos React Native) para web/PWA.
// -----------------------------------------------------------------------------

/**
 * Máscara de moeda brasileira. Trata o input como centavos (digitação contínua).
 * Ex: "1" → "0,01" | "123" → "1,23" | "12345" → "123,45" | "1234567" → "12.345,67"
 *
 * @param {string|number} v
 * @returns {string} valor formatado com vírgula decimal e ponto de milhar
 */
export function currencyMask(v) {
    const digits = String(v ?? '').replace(/\D/g, '');
    if (!digits) return '';
    const num = parseInt(digits, 10) / 100;
    return num.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

/**
 * Máscara com prefixo R$ — útil em campos de valor monetário.
 * Ex: "1234" → "R$ 12,34"
 *
 * @param {string|number} v
 * @returns {string}
 */
export function brlMask(v) {
    const masked = currencyMask(v);
    return masked ? `R$ ${masked}` : '';
}

/**
 * Converte string mascarada de volta para Number JS.
 * Aceita formatos: "R$ 6,99" | "6,99" | "6.99" | "1.234,56" | "1234.56"
 *
 * @param {string} v
 * @returns {number}
 */
export function currencyToNumber(v) {
    if (v === null || v === undefined || v === '') return 0;
    let s = String(v).replace(/[^\d.,-]/g, '');
    // Se tem ambos . e , o último separador é decimal (formato pt-BR: 1.234,56)
    if (s.includes(',') && s.includes('.')) {
        s = s.replace(/\./g, '').replace(',', '.');
    } else if (s.includes(',')) {
        s = s.replace(',', '.');
    }
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
}

/**
 * Máscara para números decimais com 1 casa decimal (típico de litros: "123,7").
 * Ex: "1" → "0,1" | "1237" → "123,7"
 *
 * @param {string|number} v
 * @returns {string}
 */
export function decimalMask(v) {
    const digits = String(v ?? '').replace(/\D/g, '');
    if (!digits) return '';
    const num = parseInt(digits, 10) / 10;
    return num.toLocaleString('pt-BR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    });
}

/**
 * Converte string decimal mascarada para Number.
 * Ex: "123,7" → 123.7
 *
 * @param {string} v
 * @returns {number}
 */
export function decimalToNumber(v) {
    return currencyToNumber(v);
}

/**
 * Bloqueia separadores num input de inteiro — se o usuário digitou algo não-numérico,
 * mantém o valor anterior. Caso contrário, retorna só os dígitos.
 *
 * @param {string} input
 * @param {string} prev - valor anterior (fallback)
 * @returns {string}
 */
export function integerInputBlockingSeparators(input, prev = '') {
    const cleaned = String(input ?? '').replace(/\D/g, '');
    return cleaned || (cleaned === '' ? '' : prev);
}

/**
 * Apenas dígitos (string).
 *
 * @param {string|number} v
 * @returns {string}
 */
export function onlyDigits(v) {
    return String(v ?? '').replace(/\D/g, '');
}

/**
 * Versão segura para exibir um inteiro — converte número para string limpa.
 *
 * @param {string|number} v
 * @returns {string}
 */
export function integerInputValue(v) {
    if (v === null || v === undefined || v === '') return '';
    return String(v).replace(/\D/g, '');
}

/**
 * Versão "número" — parseInt com fallback se inválido.
 *
 * @param {string|number} v
 * @param {number} fallback
 * @returns {number}
 */
export function integerNumberValue(v, fallback = 0) {
    const n = parseInt(String(v ?? '').replace(/\D/g, ''), 10);
    return Number.isNaN(n) ? fallback : n;
}

/**
 * Formata número como BRL: 1234.56 → "R$ 1.234,56"
 *
 * @param {number} n
 * @returns {string}
 */
export function formatBRL(n) {
    const num = typeof n === 'number' ? n : currencyToNumber(n);
    return num.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });
}

export default {
    currencyMask,
    brlMask,
    currencyToNumber,
    decimalMask,
    decimalToNumber,
    integerInputBlockingSeparators,
    integerInputValue,
    integerNumberValue,
    onlyDigits,
    formatBRL,
};
