export default function PrimaryButton({ className = '', disabled, children, ...props }) {
    return (
        <button
            {...props}
            className={
                `inline-flex items-center px-4 py-2 bg-rise-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-rise-700 focus:bg-rise-700 active:bg-rise-800 focus:outline-none focus:ring-2 focus:ring-rise-500 focus:ring-offset-2 transition ease-in-out duration-150 ${
                    disabled && 'opacity-25 cursor-not-allowed'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
