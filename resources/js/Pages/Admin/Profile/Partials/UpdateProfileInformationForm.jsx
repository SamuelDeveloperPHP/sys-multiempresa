import { useRef, useState } from 'react';
import { Link, useForm, usePage } from '@inertiajs/react';
import { IMaskInput } from 'react-imask';

export default function UpdateProfileInformation({ mustVerifyEmail, status, className = '', user }) {
    const photoInput = useRef();
    const { data, setData, patch, errors, processing, recentlySuccessful } = useForm({
        name: user.name,
        email: user.email,
    });

    const { data: photoData, setData: setPhotoData, post: postPhoto, errors: photoErrors, processing: photoProcessing, recentlySuccessful: photoSuccessful } = useForm({
        photo: null,
    });

    const submit = (e) => {
        e.preventDefault();
        patch(route('profile.update'));
    };

    const updatePhoto = (e) => {
        if (!photoData.photo) return;
        
        postPhoto(route('profile.photo.update'), {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const selectNewPhoto = (e) => {
        if (e.target.files[0]) {
            setPhotoData('photo', e.target.files[0]);
            // Automatically submit after choosing
            setTimeout(() => {
                const event = new Event('submit', { bubbles: true, cancelable: true });
                photoInput.current?.form?.dispatchEvent(event);
            }, 100);
        }
    };

    return (
        <section className={className}>
            <header>
                <h2 className="text-lg font-medium text-gray-900 border-b border-gray-100 pb-2">Informações Iniciais</h2>
                <p className="mt-1 text-sm text-gray-600 mb-6">
                    Atualize os dados de perfil da sua conta e o seu endereço de email.
                </p>
            </header>

            {/* Photo Update Component */}
            <div className="mb-8 flex items-center space-x-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="shrink-0">
                    <img 
                        className="h-20 w-20 object-cover rounded-full shadow border-2 border-white" 
                        src={photoData.photo ? URL.createObjectURL(photoData.photo) : user.profile_photo_url} 
                        alt={user.name} 
                    />
                </div>
                <form onSubmit={(e) => { e.preventDefault(); updatePhoto(); }}>
                    <label className="block sm:inline-flex justify-center items-center px-4 py-2 bg-white border border-gray-300 rounded-md font-semibold text-xs text-gray-700 uppercase tracking-widest shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#557bbb] focus:ring-offset-2 disabled:opacity-25 transition ease-in-out duration-150 cursor-pointer">
                        <span>Nova Foto</span>
                        <input 
                            type="file" 
                            className="hidden" 
                            ref={photoInput} 
                            onChange={selectNewPhoto}
                            accept="image/*"
                        />
                    </label>
                    
                    {photoErrors.photo && <p className="text-sm text-red-600 mt-2">{photoErrors.photo}</p>}
                    
                    {photoSuccessful && (
                        <p className="text-sm text-green-600 mt-2 font-medium">Foto atualizada.</p>
                    )}
                </form>
            </div>

            <form onSubmit={submit} className="mt-6 space-y-6">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nome</label>
                    <input
                        id="name"
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#557bbb] focus:ring focus:ring-[#557bbb] focus:ring-opacity-50"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        required
                        autoFocus
                        autoComplete="name"
                    />
                    {errors.name && <p className="text-sm text-red-600 mt-2">{errors.name}</p>}
                </div>

                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                        id="email"
                        type="email"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#557bbb] focus:ring focus:ring-[#557bbb] focus:ring-opacity-50 bg-gray-50"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        required
                        autoComplete="username"
                        readOnly // Email often shouldn't be changeable trivially without verification flow, but we leave it per framework config. Removing readonly.
                    />
                    {errors.email && <p className="text-sm text-red-600 mt-2">{errors.email}</p>}
                </div>

                {mustVerifyEmail && user.email_verified_at === null && (
                    <div>
                        <p className="text-sm mt-2 text-gray-800">
                            Seu email ainda não foi verificado.
                            <Link
                                href={route('verification.send')}
                                method="post"
                                as="button"
                                className="underline text-sm text-gray-600 hover:text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#557bbb] ml-1"
                            >
                                Clique aqui para reenviar o email de verificação.
                            </Link>
                        </p>

                        {status === 'verification-link-sent' && (
                            <div className="mt-2 font-medium text-sm text-green-600">
                                Um novo link foi enviado para seu email.
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-4">
                    <button 
                        disabled={processing} 
                        className="inline-flex justify-center rounded-md border border-transparent bg-[#557bbb] py-2 px-4-sm px-6 text-sm font-medium text-white shadow-sm hover:bg-[#009b80] focus:outline-none focus:ring-2 focus:ring-[#557bbb] focus:ring-offset-2 disabled:opacity-50"
                    >
                        Salvar Alterações
                    </button>

                    {recentlySuccessful && <p className="text-sm text-green-600 transition ease-in-out font-medium">Salvo com sucesso.</p>}
                </div>
            </form>
        </section>
    );
}
