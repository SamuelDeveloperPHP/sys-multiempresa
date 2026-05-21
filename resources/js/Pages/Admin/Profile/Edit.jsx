import { useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import TwoFactorAuthenticationForm from './Partials/TwoFactorAuthenticationForm';
import GeolocationForm from './Partials/GeolocationForm';
import BiometricsForm from './Partials/BiometricsForm';

export default function Edit({ mustVerifyEmail, status, requires_2fa_setup, two_factor_secret, two_factor_qr_url }) {
    const { auth } = usePage().props;
    const [activeTab, setActiveTab] = useState('geral');

    const tabs = [
        { id: 'geral', label: 'Dados Gerais', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
        { id: 'senha', label: 'Segurança', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
        { id: '2fa', label: '2FA', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
        { id: 'biometria', label: 'Biometria', icon: 'M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z' },
        { id: 'localizacao', label: 'Localização', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z' },
    ];

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Meu Perfil</h2>}
        >
            <Head title="Perfil" />

            <div className="py-8">
                <div className="w-full sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-xl border border-gray-100 flex flex-col md:flex-row min-h-[600px]">
                        
                        {/* Sidebar */}
                        <div className="w-full md:w-64 bg-gray-50 border-r border-gray-100 p-6 flex flex-col space-y-2 shrink-0">
                            <div className="mb-6 flex flex-col items-center">
                                <img 
                                    src={auth.user.profile_photo_url} 
                                    alt={auth.user.name} 
                                    className="h-20 w-20 rounded-full object-cover border-4 border-white shadow-sm"
                                />
                                <h3 className="mt-4 text-center font-bold text-gray-900 border-b-2 border-[#557bbb] pb-1">{auth.user.name}</h3>
                                <p className="mt-1 text-xs text-gray-500">{auth.user.email}</p>
                            </div>

                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-150 ${activeTab === tab.id ? 'bg-[#557bbb] text-white shadow-md' : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'}`}
                                >
                                    <svg className="h-5 w-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={tab.icon} />
                                    </svg>
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Content Area */}
                        <div className="p-8 w-full bg-white">
                            {activeTab === 'geral' && (
                                <div className="max-w-2xl">
                                    <UpdateProfileInformationForm
                                        mustVerifyEmail={mustVerifyEmail}
                                        status={status}
                                        user={auth.user}
                                    />
                                </div>
                            )}

                            {activeTab === 'senha' && (
                                <div className="max-w-2xl">
                                    <UpdatePasswordForm />
                                </div>
                            )}

                            {activeTab === '2fa' && (
                                <div className="max-w-2xl">
                                    <TwoFactorAuthenticationForm 
                                        user={auth.user}
                                        requiresSetup={requires_2fa_setup}
                                        qrCodeUrl={two_factor_qr_url}
                                        secret={two_factor_secret}
                                    />
                                </div>
                            )}

                            {activeTab === 'biometria' && (
                                <div className="max-w-2xl">
                                    <BiometricsForm />
                                </div>
                            )}

                            {activeTab === 'localizacao' && (
                                <div className="max-w-2xl">
                                    <GeolocationForm user={auth.user} />
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
