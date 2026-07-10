import { useState } from 'react';

/**
 * Painel recolhível (accordion). `header` é o conteúdo do cabeçalho clicável
 * (título/badges); `defaultOpen` define se começa expandido; `headerClass`
 * pinta o cabeçalho (ex.: bg-rose-50). O corpo (children) só renderiza aberto.
 */
export default function Accordion({ header, defaultOpen = false, headerClass = '', className = '', children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`bg-white rounded-lg border overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full px-4 py-3 flex items-center justify-between gap-2 text-left ${headerClass} ${open ? 'border-b' : ''}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-wrap">{header}</div>
        <span className="text-gray-400 text-sm shrink-0">{open ? '▲' : '▼'}</span>
      </button>
      {open && children}
    </div>
  );
}
