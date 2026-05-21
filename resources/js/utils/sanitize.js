// resources/js/utils/sanitize.js
// -----------------------------------------------------------------------------
// Helper centralizado para uso seguro de dangerouslySetInnerHTML.
//
// Uso:
//   import { safeHtml } from '@/utils/sanitize';
//   <div dangerouslySetInnerHTML={safeHtml(htmlVindoDoBanco)} />
//
// Por que? O nicEdit do sistema legado (e o editor de blog) salvam HTML cru
// no banco. Renderizar isso sem sanitizar abre brecha para XSS persistente —
// um atacante salva <script>fetch('/api/admin/users').then(...)</script> e
// roda no browser de qualquer usuário que abrir aquela página.
//
// O DOMPurify remove qualquer tag/atributo perigoso (script, on*, javascript:)
// preservando formatação visual.
// -----------------------------------------------------------------------------

import DOMPurify from 'dompurify';

// Lista de tags permitidas — cobertura suficiente para conteúdo de nicEdit/CKE.
const ALLOWED_TAGS = [
    'p', 'br', 'div', 'span', 'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'td', 'th',
    'blockquote', 'pre', 'code',
    'hr', 'small', 'mark',
];

const ALLOWED_ATTR = [
    'href', 'target', 'rel', 'title',
    'src', 'alt', 'width', 'height',
    'class', 'style',
    'colspan', 'rowspan',
];

/**
 * Sanitiza HTML retornando o objeto esperado por dangerouslySetInnerHTML.
 * @param {string} dirty
 * @returns {{__html: string}}
 */
export function safeHtml(dirty) {
    if (dirty == null || dirty === '') return { __html: '' };
    const clean = DOMPurify.sanitize(String(dirty), {
        ALLOWED_TAGS,
        ALLOWED_ATTR,
        ALLOW_DATA_ATTR: false,
        // Garante que links externos abram em nova aba e quebrem rel=noopener
        ADD_ATTR: ['target'],
    });
    return { __html: clean };
}

/**
 * Versão "mínima" só para texto/labels da paginação Laravel — só permite
 * entidades HTML básicas como &laquo; &raquo;.
 */
export function safeLabel(dirty) {
    if (dirty == null) return { __html: '' };
    const clean = DOMPurify.sanitize(String(dirty), {
        ALLOWED_TAGS: ['span', 'i', 'b', 'strong'],
        ALLOWED_ATTR: ['class'],
    });
    return { __html: clean };
}

export default safeHtml;
