import { useEffect } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AuthLayout from '../../Layouts/AuthLayout';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    useEffect(() => {
        return () => {
            reset('password');
        };
    }, []);

    const submit = (e) => {
        e.preventDefault();
        post('/login');
    };

    return (
        <AuthLayout>
            <Head title="Acesso Administrativo" />
            
            <div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Bem-vindo(a) de volta</h2>
                <p className="mt-2 text-sm text-gray-500">
                    Insira suas credenciais para acessar os projetos.
                </p>
            </div>

            {status && <div className="mt-4 font-medium text-sm text-green-600">{status}</div>}

            <form onSubmit={submit} className="mt-8 space-y-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">E-mail corporativo</label>
                        <div className="mt-1">
                            <input type="email" required autoFocus autoComplete="username"
                                value={data.email} onChange={e => setData('email', e.target.value)}
                                className={`appearance-none block w-full px-4 py-3 rounded-xl border ${errors.email ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'} focus:outline-none focus:ring-2 focus:border-transparent transition-all sm:text-sm text-gray-900 shadow-sm bg-white placeholder-gray-400`} 
                                placeholder="nome@empresa.com" />
                            {errors.email && <p className="mt-2 text-sm text-red-600 font-medium">{errors.email}</p>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Senha</label>
                        <div className="mt-1">
                            <input type="password" required autoComplete="current-password"
                                value={data.password} onChange={e => setData('password', e.target.value)}
                                className={`appearance-none block w-full px-4 py-3 rounded-xl border ${errors.password ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'} focus:outline-none focus:ring-2 focus:border-transparent transition-all sm:text-sm text-gray-900 shadow-sm bg-white`} 
                                placeholder="••••••••" />
                            {errors.password && <p className="mt-2 text-sm text-red-600 font-medium">{errors.password}</p>}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <input id="remember" name="remember" type="checkbox" checked={data.remember} onChange={e => setData('remember', e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded text-blue-600 focus:ring-offset-0 transition-colors" />
                        <label htmlFor="remember" className="ml-2 block text-sm text-gray-600">
                            Lembrar neste dispositivo
                        </label>
                    </div>

                    {canResetPassword && (
                        <div className="text-sm">
                            <Link href="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
                                Esqueceu a senha?
                            </Link>
                        </div>
                    )}
                </div>

                <div>
                    <button type="submit" disabled={processing}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-all disabled:opacity-50">
                        {processing ? 'Autenticando...' : 'Acessar o Painel'}
                    </button>
                </div>
            </form>
        </AuthLayout>
    );
}
