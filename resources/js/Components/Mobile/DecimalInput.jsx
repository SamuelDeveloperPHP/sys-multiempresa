// resources/js/Components/Mobile/DecimalInput.jsx
// -----------------------------------------------------------------------------
// Input para números decimais com 1 casa (típico de litros: "123,7").
// Digitação contínua tratada como décimos: "1237" → "123,7".
//
// Uso:
//   const [litros, setLitros] = useState('');
//   <DecimalInput value={litros} onChange={setLitros} suffix="L" />
// -----------------------------------------------------------------------------

import { decimalMask } from '@/utils/numberInput';

export default function DecimalInput({
    value = '',
    onChange,
    placeholder = '0,0',
    suffix = null,
    className = '',
    disabled = false,
    error = null,
    label = null,
    required = false,
    autoFocus = false,
    ...rest
}) {
    const handleChange = (e) => {
        const masked = decimalMask(e.target.value);
        onChange?.(masked);
    };

    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                    {required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
            )}
            <div className="relative">
                <input
                    type="text"
                    inputMode="numeric"
                    value={value}
                    onChange={handleChange}
                    placeholder={placeholder}
                    disabled={disabled}
                    autoFocus={autoFocus}
                    className={`w-full px-3 py-2.5 ${suffix ? 'pr-12' : ''} rounded-lg border text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors ${
                        error
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                            : 'border-gray-200 focus:border-[#557bbb] focus:ring-[#557bbb]/30'
                    } ${disabled ? 'bg-gray-50 text-gray-500' : 'bg-white'} ${className}`}
                    {...rest}
                />
                {suffix && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">
                        {suffix}
                    </span>
                )}
            </div>
            {error && (
                <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>
            )}
        </div>
    );
}
