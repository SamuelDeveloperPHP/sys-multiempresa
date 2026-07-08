// resources/js/Components/Mobile/FotoEvidencia.jsx
// -----------------------------------------------------------------------------
// Miniatura de foto (evidência/comprovante) com toque para expandir.
// Aceita tanto data URL local (registro pendente) quanto URL do servidor.
// -----------------------------------------------------------------------------
import { useState } from 'react';

export default function FotoEvidencia({ src, alt = 'Foto' }) {
    const [expanded, setExpanded] = useState(false);
    if (!src) return null;
    return (
        <img
            src={src}
            alt={alt}
            loading="lazy"
            onClick={() => setExpanded((v) => !v)}
            className={`mt-2 rounded-md border border-gray-200 cursor-zoom-in object-cover transition-all ${
                expanded ? 'w-full h-auto cursor-zoom-out' : 'w-20 h-20'
            }`}
        />
    );
}
