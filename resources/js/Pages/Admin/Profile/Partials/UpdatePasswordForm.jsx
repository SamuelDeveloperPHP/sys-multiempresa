import { useRef } from 'react';
import { useForm } from '@inertiajs/react';

export default function UpdatePasswordForm({ className = '' }) {
    const passwordInput = useRef();
    const currentPasswordInput = useRef();

    const { data, setData, errors, put, reset, processing, recentlySuccessful } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword = (e) => {
        e.preventDefault();

        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errors) => {
                if (errors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }

                if (errors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current?.focus();
                }
            },
        });
    };

    return (
        <section className={className}>
            <header>
                <h2 className="text-lg font-medium text-gray-900 border-b border-gray-100 pb-2">Atualizar Senha</h2>
                <p className="mt-1 text-sm text-gray-600 mb-6">
                    Mantenha sua conta segura usando uma senha longa e aleatória.
                </p>
            </header>

            <form onSubmit={updatePassword} className="space-y-6">
                <div>
                    <label htmlFor="current_password" className="block text-sm font-medium text-gray-700">Senha Atual</label>
                    <input
                        id="current_password"
                        ref={currentPasswordInput}
                        value={data.current_password}
                        onChange={(e) => setData('current_password', e.target.value)}
                        type="password"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#557bbb] focus:ring focus:ring-[#557bbb] focus:ring-opacity-50"
                        autoComplete="current-password"
                    />
                    {errors.current_password && <p className="text-sm text-red-600 mt-2">{errors.current_password}</p>}
                </div>

                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">Nova Senha</label>
                    <input
                        id="password"
                        ref={passwordInput}
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        type="password"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#557bbb] focus:ring focus:ring-[#557bbb] focus:ring-opacity-50"
                        autoComplete="new-password"
                    />
                    {errors.password && <p className="text-sm text-red-600 mt-2">{errors.password}</p>}
                </div>

                <div>
                    <label htmlFor="password_confirmation" className="block text-sm font-medium text-gray-700">Confirmar Nova Senha</label>
                    <input
                        id="password_confirmation"
                        value={data.password_confirmation}
                        onChange={(e) => setData('password_confirmation', e.target.value)}
                        type="password"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#557bbb] focus:ring focus:ring-[#557bbb] focus:ring-opacity-50"
                        autoComplete="new-password"
                    />
                    {errors.password_confirmation && <p className="text-sm text-red-600 mt-2">{errors.password_confirmation}</p>}
                </div>

                <div className="flex items-center gap-4">
                    <button 
                        disabled={processing} 
                        className="inline-flex justify-center rounded-md border border-transparent bg-gray-900 py-2 px-6 text-sm font-medium text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-50"
                    >
                        Trocar Senha
                    </button>

                    {recentlySuccessful && <p className="text-sm text-green-600 font-medium">Senha atualizada.</p>}
                </div>
            </form>
        </section>
    );
}
