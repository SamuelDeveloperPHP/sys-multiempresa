/**
 * ApplicationLogo — logo padrão do SGA Engeativos.
 *
 * Usa /imagens/logos/adaptive-icon.png. Aceita className para dimensionamento
 * via Tailwind (ex: <ApplicationLogo className="h-10 w-10" />) e demais atributos
 * de <img> (alt, style, onClick, etc).
 */
export default function ApplicationLogo({ className = 'h-8 w-8', alt = 'SGA Engeativos', ...props }) {
    return (
        <img
            src="/imagens/logos/adaptive-icon.png"
            alt={alt}
            className={className}
            {...props}
        />
    );
}
