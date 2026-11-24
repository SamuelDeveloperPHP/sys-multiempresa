import { Head, useForm, usePage } from '@inertiajs/react';
import { grantOfflineSecondFactor, startOfflineSession } from '@/offline/offlineAuth';

export default function TwoFactorChallenge() {
    const { auth } = usePage().props;
    const { data, setData, post, processing, errors } = useForm({ code: '' });

    const submit = (event) => {
        event.preventDefault();
        post('/two-factor-challenge', {
            onSuccess: async (page) => {
                const user = page?.props?.auth?.user || auth?.user;
                if (!user?.id) return;
                await grantOfflineSecondFactor(user);
                await startOfflineSession(user);
            },
        });
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
            <Head title="Verificação em dois fatores" />
            <section className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-sm p-8">
                <div className="text-center mb-7">
                    <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-blue-50 text-[#557bbb] flex items-center justify-center">
                        <i className="fa-solid fa-shield-halved text-xl" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Confirme sua identidade</h1>
                    <p className="mt-2 text-sm text-slate-500">
                        Digite o código do aplicativo autenticador ou um código de recuperação.
                    </p>
                </div>

                <form onSubmit={submit} className="space-y-5">
                    <div>
                        <label htmlFor="code" className="block text-sm font-medium text-slate-700 mb-1">Código de segurança</label>
                        <input
                            id="code"
                            value={data.code}
                            onChange={(event) => setData('code', event.target.value)}
                            autoComplete="one-time-code"
                            autoFocus
                            required
                            maxLength={32}
                            className="w-full rounded-xl border-slate-300 text-center font-mono text-xl tracking-widest focus:border-[#557bbb] focus:ring-[#557bbb]"
                            placeholder="000000"
                        />
                        {errors.code && <p className="mt-2 text-sm text-red-600">{errors.code}</p>}
                    </div>

                    <button disabled={processing} className="w-full rounded-xl bg-[#557bbb] py-3 text-sm font-semibold text-white hover:bg-[#4263a3] disabled:opacity-50">
                        {processing ? 'Verificando…' : 'Continuar'}
                    </button>
                </form>

                <form method="post" action="/logout" className="mt-5 text-center">
                    <input type="hidden" name="_token" value={document.querySelector('meta[name="csrf-token"]')?.content || ''} />
                    <button className="text-sm text-slate-500 hover:text-slate-800 underline">Sair desta conta</button>
                </form>
            </section>
        </main>
    );
}
