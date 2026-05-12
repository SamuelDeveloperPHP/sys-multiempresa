import { useEffect } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AuthLayout from '../../Layouts/AuthLayout';

export default function ConfirmPassword() {
    const { data, setData, post, processing, errors, reset } = useForm({
        password: '',
    });

    useEffect(() => {
        return () => {
            reset('password');
        };
    }, []);

    const submit = (e) => {
        e.preventDefault();
        post('/confirm-password');
    };

    return (
        <AuthLayout>
            <Head title="Confirmar Senha" />

            <div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Área Restrita</h2>
                <p className="mt-2 text-sm text-gray-500">
                    Esta é uma área segura da aplicação. Por favor, confirme sua senha antes de continuar.
                </p>
            </div>

            <form onSubmit={submit} className="mt-8 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Senha Segura</label>
                    <div className="mt-1">
                        <input type="password" required autoFocus
                            value={data.password} onChange={e => setData('password', e.target.value)}
                            className="appearance-none block w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm text-gray-900 shadow-sm" />
                        {errors.password && <p className="mt-2 text-sm text-red-600">{errors.password}</p>}
                    </div>
                </div>

                <div>
                    <button type="submit" disabled={processing}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition-all">
                        {processing ? 'Confirmando...' : 'Confirmar Identidade'}
                    </button>
                </div>
            </form>
        </AuthLayout>
    );
}
