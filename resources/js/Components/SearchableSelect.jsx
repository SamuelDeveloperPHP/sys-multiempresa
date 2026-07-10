import { useEffect, useRef, useState } from 'react';

/**
 * Select com busca (estilo Select2) para o React/Inertia.
 * Props:
 *   value    — valor selecionado (string/number)
 *   onChange — (novoValor: string) => void  ('' quando limpa)
 *   options  — [{ value, label }]
 */
export default function SearchableSelect({ value, onChange, options = [], placeholder = '— selecione —', className = '' }) {
  const selected = options.find((o) => String(o.value) === String(value));
  const [query, setQuery] = useState(selected?.label ?? '');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const boxRef = useRef(null);

  // Reflete mudança externa do valor (ex.: limpar filtros)
  useEffect(() => { setQuery(selected?.label ?? ''); /* eslint-disable-next-line */ }, [value]);

  useEffect(() => {
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = (!q ? options : options.filter((o) => o.label.toLowerCase().includes(q))).slice(0, 60);
  const pick = (o) => { onChange(String(o.value)); setQuery(o.label); setOpen(false); };

  const base = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-rise-500 focus:border-rise-500';

  return (
    <div className={`relative ${className}`} ref={boxRef}>
      <input
        value={query}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setHi(0); if (e.target.value === '') onChange(''); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHi((h) => Math.min(filtered.length - 1, h + 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
          else if (e.key === 'Enter' && open && filtered[hi]) { e.preventDefault(); pick(filtered[hi]); }
          else if (e.key === 'Escape') setOpen(false);
        }}
        className={`${base} pr-8`}
      />
      {value ? (
        <button type="button" tabIndex={-1} onClick={() => { onChange(''); setQuery(''); setOpen(false); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>
      ) : (
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">▾</span>
      )}
      {open && (
        <ul className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg text-sm">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs text-gray-400">Nada encontrado</li>
          ) : filtered.map((o, i) => (
            <li key={o.value}>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); pick(o); }} onMouseEnter={() => setHi(i)}
                className={`block w-full text-left px-3 py-1.5 ${i === hi ? 'bg-rise-50 text-rise-800' : 'hover:bg-gray-50'}`}>
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
