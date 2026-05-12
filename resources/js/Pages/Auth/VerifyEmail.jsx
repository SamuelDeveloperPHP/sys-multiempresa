import { Head, Link, useForm } from '@inertiajs/react';
import AuthLayout from '../../Layouts/AuthLayout';

export default function VerifyEmail({ status }) {
    const { post, processing } = useForm({});

    const submit = (e) => {
        e.preventDefault();
        post('/email/verification-notification');
    };

    return (
        <AuthLayout>
            <Head title="Verificação de E-mail" />

            <div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Quase lá!</h2>
                <p className="mt-2 text-sm text-gray-500">
                    Obrigado por se inscrever! Antes de começarmos, você poderia verificar seu endereço de e-mail clicando no link que acabamos de enviar para você? Se você não recebeu o e-mail, teremos prazer em enviar outro.
                </p>
            </div>

            {status === 'verification-link-sent' && (
                <div className="mt-4 font-medium text-sm text-green-600">
                    Um novo link de verificação foi enviado para o endereço de e-mail fornecido.
                </div>
            )}

            <form onSubmit={submit} className="mt-8 flex items-center justify-between">
                <button type="submit" disabled={processing}
                    className="py-3 px-6 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 transition-all">
                    Reenviar E-mail
                </button>

                <Link href="/logout" method="post" as="button" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
                    Sair da Conta
                </Link>
            </form>
        </AuthLayout>
    );
}
