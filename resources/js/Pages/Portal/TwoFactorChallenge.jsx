import { useForm } from '@inertiajs/react';

export default function TwoFactorChallenge() {
    const { data, setData, post, processing, errors } = useForm({
        code: ''
    });

    const submit = (e) => {
        e.preventDefault();
        post('/portal/2fa/challenge');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] font-sans antialiased">
            <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-100 p-8 m-4">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 text-gray-600 border border-gray-100 mb-4">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Autenticação 2FA</h1>
                    <p className="text-sm text-gray-500 mt-2">Proteção adicional ativada. Confirme sua identidade.</p>
                </div>
                
                <form onSubmit={submit} className="space-y-6">
                    <div>
                        <input type="text" maxLength="6" value={data.code} onChange={e => setData('code', e.target.value)} required autoFocus
                            className="w-full text-center tracking-widest text-3xl font-mono px-4 py-4 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none" placeholder="000000" />
                        {errors.code && <div className="text-red-500 text-sm mt-3 text-center font-medium">{errors.code}</div>}
                    </div>
                    
                    <button disabled={processing} className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 rounded-lg shadow-sm transition-colors">
                        {processing ? 'Verificando...' : 'Acessar Conta'}
                    </button>
                </form>
            </div>
        </div>
    );
}
