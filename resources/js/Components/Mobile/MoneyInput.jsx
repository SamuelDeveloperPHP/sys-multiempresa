// resources/js/Components/Mobile/MoneyInput.jsx
// -----------------------------------------------------------------------------
// Input com máscara de moeda BRL (R$). Digitação é tratada como centavos:
// digite "699" → "R$ 6,99". Valor sempre tem 2 casas decimais.
//
// Uso:
//   const [valor, setValor] = useState('');
//   <MoneyInput value={valor} onChange={setValor} placeholder="R$ 0,00" />
//
// Para obter o valor numérico (Number JS), use currencyToNumber(valor).
// -----------------------------------------------------------------------------

import { brlMask } from '@/utils/numberInput';

export default function MoneyInput({
    value = '',
    onChange,
    placeholder = 'R$ 0,00',
    className = '',
    disabled = false,
    error = null,
    label = null,
    required = false,
    autoFocus = false,
    inputMode = 'numeric',
    ...rest
}) {
    const handleChange = (e) => {
        const masked = brlMask(e.target.value);
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
            <input
                type="text"
                inputMode={inputMode}
                value={value}
                onChange={handleChange}
                placeholder={placeholder}
                disabled={disabled}
                autoFocus={autoFocus}
                className={`w-full px-3 py-2.5 rounded-lg border text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors ${
                    error
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                        : 'border-gray-200 focus:border-[#557bbb] focus:ring-[#557bbb]/30'
                } ${disabled ? 'bg-gray-50 text-gray-500' : 'bg-white'} ${className}`}
                {...rest}
            />
            {error && (
                <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>
            )}
        </div>
    );
}
