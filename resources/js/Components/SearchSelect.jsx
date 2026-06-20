// resources/js/Components/SearchSelect.jsx
// -----------------------------------------------------------------------------
// Combobox pesquisável (estilo Select2), 100% client-side, sem dependência.
//   - Filtra por label e sub, ignorando acento e caixa.
//   - Teclado: ↑ ↓ Enter Esc.
//   - Botão limpar.
//   - options: [{ value, label, sub? }]
// -----------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from 'react';

export default function SearchSelect({
    options = [],
    value,
    onChange,
    placeholder = 'Selecione…',
    allowClear = true,
    disabled = false,
    className = '',
    allowCreate = false,   // permite criar um valor novo a partir do texto digitado
    sm = false,            // tamanho compacto (equivalente ao form-control-sm)
}) {
    const [open, setOpen]   = useState(false);
    const [query, setQuery] = useState('');
    const [hover, setHover] = useState(0);
    const wrapRef  = useRef(null);
    const inputRef = useRef(null);
    const listRef  = useRef(null);

    const selected = useMemo(
        () => options.find((o) => String(o.value) === String(value)) ?? null,
        [options, value]
    );
    // Valor criado livremente (não está nas opções) — exibe o próprio texto.
    const displayLabel = selected ? selected.label : (value ? String(value) : null);

    const normalize = (s) => (s ?? '')
        .toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

    const filtered = useMemo(() => {
        const q = normalize(query.trim());
        if (!q) return options;
        return options.filter((o) =>
            normalize(o.label).includes(q) || normalize(o.sub).includes(q)
        );
    }, [options, query]);

    useEffect(() => {
        const h = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) {
                setOpen(false); setQuery('');
            }
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    useEffect(() => {
        if (open) { setTimeout(() => inputRef.current?.focus(), 0); setHover(0); }
    }, [open]);

    useEffect(() => {
        if (!open || !listRef.current) return;
        const el = listRef.current.querySelector(`[data-idx="${hover}"]`);
        if (el) el.scrollIntoView({ block: 'nearest' });
    }, [hover, open]);

    const escolher = (opt) => { onChange(opt.value); setOpen(false); setQuery(''); };
    const limpar = (e) => { e.stopPropagation(); onChange(''); setQuery(''); };
    const criar = (raw) => { const v = String(raw).trim(); if (v) { onChange(v); setOpen(false); setQuery(''); } };

    // Mostra a opção "criar" quando habilitado, há texto e nenhuma opção bate exatamente.
    const qTrim = query.trim();
    const podeCriar = allowCreate && qTrim
        && !options.some((o) => normalize(o.label) === normalize(qTrim));

    const onKey = (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setHover((h) => Math.min(h + 1, filtered.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setHover((h) => Math.max(h - 1, 0)); }
        else if (e.key === 'Enter')   {
            e.preventDefault();
            if (filtered[hover]) escolher(filtered[hover]);
            else if (podeCriar) criar(qTrim);
        }
        else if (e.key === 'Escape')  { setOpen(false); setQuery(''); }
    };

    return (
        <div ref={wrapRef} className={`relative ${className}`}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setOpen((o) => !o)}
                className={`w-full border rounded-lg text-left bg-white flex items-center gap-2 text-sm transition ${sm ? 'px-2 py-1' : 'px-3 py-2'} ${
                    disabled
                        ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'border-gray-300 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-rise-500'
                }`}
            >
                <span className={`flex-1 truncate ${displayLabel ? 'text-gray-900' : 'text-gray-400'}`}>
                    {displayLabel ?? placeholder}
                </span>
                {allowClear && displayLabel && !disabled && (
                    <span onClick={limpar} role="button" tabIndex={-1}
                          className="text-gray-400 hover:text-red-600 px-1" title="Limpar">✕</span>
                )}
                <span className="text-gray-400 text-xs">▾</span>
            </button>

            {open && !disabled && (
                <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                    <div className="p-2 border-b">
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => { setQuery(e.target.value); setHover(0); }}
                            onKeyDown={onKey}
                            placeholder="Digite para filtrar…"
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rise-500"
                        />
                    </div>
                    <ul ref={listRef} className="max-h-64 overflow-y-auto text-sm py-1">
                        {podeCriar && (
                            <li onClick={() => criar(qTrim)}
                                className="px-3 py-2 cursor-pointer text-rise-700 hover:bg-rise-50 border-b">
                                <i className="fa-solid fa-plus text-xs mr-1.5" />
                                Criar “<strong>{qTrim}</strong>”
                            </li>
                        )}
                        {filtered.length === 0 && !podeCriar ? (
                            <li className="px-3 py-2 text-gray-500">Nenhum resultado.</li>
                        ) : filtered.map((opt, i) => (
                            <li
                                key={opt.value}
                                data-idx={i}
                                onMouseEnter={() => setHover(i)}
                                onClick={() => escolher(opt)}
                                className={`px-3 py-2 cursor-pointer flex flex-col ${
                                    i === hover ? 'bg-rise-50 text-rise-700' : 'hover:bg-gray-50'
                                } ${String(opt.value) === String(value) ? 'font-semibold' : ''}`}
                            >
                                <span className="truncate">{opt.label}</span>
                                {opt.sub && <span className="text-[11px] text-gray-500 truncate">{opt.sub}</span>}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
