import { Head, useForm, Link } from '@inertiajs/react';
import AuthLayout from '../../Layouts/AuthLayout';

export default function ForgotPassword({ status }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post('/forgot-password');
    };

    return (
        <AuthLayout>
            <Head title="Recuperar Senha" />

            <div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Recuperar Senha</h2>
                <p className="mt-2 text-sm text-gray-500">
                    Esqueceu sua senha? Sem problemas. Apenas nos informe seu e-mail corporativo.
                </p>
            </div>

            {status && <div className="mt-4 font-medium text-sm text-green-600">{status}</div>}

            <form onSubmit={submit} className="mt-8 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700">E-mail corporativo</label>
                    <div className="mt-1">
                        <input type="email" required autoFocus
                            value={data.email} onChange={e => setData('email', e.target.value)}
                            className="appearance-none block w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm text-gray-900 shadow-sm" />
                        {errors.email && <p className="mt-2 text-sm text-red-600">{errors.email}</p>}
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <Link href="/login" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">Voltar ao login</Link>
                    <button type="submit" disabled={processing}
                        className="py-3 px-6 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition-all">
                        {processing ? 'Enviando...' : 'Enviar Link'}
                    </button>
                </div>
            </form>
        </AuthLayout>
    );
}
