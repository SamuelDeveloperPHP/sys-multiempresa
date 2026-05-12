import { useEffect } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AuthLayout from '../../Layouts/AuthLayout';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
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
        post('/register');
    };

    return (
        <AuthLayout>
            <Head title="Criar Conta Administrativa" />
            
            <div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Crie sua Conta</h2>
                <p className="mt-2 text-sm text-gray-500">
                    Registre um novo administrador para o projeto.
                </p>
            </div>

            <form onSubmit={submit} className="mt-8 space-y-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
                        <div className="mt-1">
                            <input type="text" required autoFocus
                                value={data.name} onChange={e => setData('name', e.target.value)}
                                className="appearance-none block w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm text-gray-900 shadow-sm" />
                            {errors.name && <p className="mt-2 text-sm text-red-600">{errors.name}</p>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">E-mail</label>
                        <div className="mt-1">
                            <input type="email" required
                                value={data.email} onChange={e => setData('email', e.target.value)}
                                className="appearance-none block w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm text-gray-900 shadow-sm" />
                            {errors.email && <p className="mt-2 text-sm text-red-600">{errors.email}</p>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Senha Segura</label>
                        <div className="mt-1">
                            <input type="password" required
                                value={data.password} onChange={e => setData('password', e.target.value)}
                                className="appearance-none block w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm text-gray-900 shadow-sm" />
                            {errors.password && <p className="mt-2 text-sm text-red-600">{errors.password}</p>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Confirme a Senha</label>
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
                        {processing ? 'Processando...' : 'Criar Conta'}
                    </button>
                    <div className="mt-4 text-center">
                        <Link href="/login" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">Já possui uma conta?</Link>
                    </div>
                </div>
            </form>
        </AuthLayout>
    );
}
