export default function ApplicationLogo({ className = 'h-8 w-8', ...props }) {
    return (
        <i className={`fa-solid fa-chart-line ${className}`} aria-hidden="true" {...props} />
    );
}
