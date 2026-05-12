import { useEffect } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AuthLayout from '../../Layouts/AuthLayout';

export default function ResetPassword({ token, email }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        token: token,
        email: email,
        password: '',
        password_confirmation: '',
    });

    useEffect(() => {
        return () => {
            reset('password', 'password_confirmation');
        };
    }, []);

    const submit = (e) => {
        e.preventDefault();
        post('/reset-password');
    };

    return (
        <AuthLayout>
            <Head title="Redefinir Senha" />

            <div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Nova Senha</h2>
                <p className="mt-2 text-sm text-gray-500">
                    Crie uma nova senha de segurança para a sua conta.
                </p>
            </div>

            <form onSubmit={submit} className="mt-8 space-y-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">E-mail corporativo</label>
                        <div className="mt-1">
                            <input type="email" required
                                value={data.email} onChange={e => setData('email', e.target.value)}
                                className="appearance-none block w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 transition-all sm:text-sm text-gray-900 shadow-sm" readOnly />
                            {errors.email && <p className="mt-2 text-sm text-red-600">{errors.email}</p>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nova Senha</label>
                        <div className="mt-1">
                            <input type="password" required autoFocus
                                value={data.password} onChange={e => setData('password', e.target.value)}
                                className="appearance-none block w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm text-gray-900 shadow-sm" />
                            {errors.password && <p className="mt-2 text-sm text-red-600">{errors.password}</p>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Confirme a Nova Senha</label>
                        <div className="mt-1">
                            <input type="password" required
                                value={data.password_confirmation} onChange={e => setData('password_confirmation', e.target.value)}
                                className="appearance-none block w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm text-gray-900 shadow-sm" />
                            {errors.password_confirmation && <p className="mt-2 text-sm text-red-600">{errors.password_confirmation}</p>}
                        </div>
                    </div>
                </div>

                <div>
                    <button type="submit" disabled={processing}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition-all">
                        {processing ? 'Redefinindo...' : 'Atualizar e Acessar'}
                    </button>
                </div>
            </form>
        </AuthLayout>
    );
}
