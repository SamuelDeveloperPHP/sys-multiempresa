export default function BiometricsForm({ className = '' }) {
    
    // Na fase atual do projeto de homologação WAMP/localhost HTTP, 
    // a API WebAuthn completa não vai funcionar com segurança sem HTTPS.
    // Assim que os pacotes do backend Mobile (API REST) estiverem integrados com laravel-webauthn, 
    // esta interface pode chamar o cadastro direto.
    
    return (
        <section className={className}>
            <header>
                <h2 className="text-lg font-medium text-gray-900 border-b border-gray-100 pb-2">
                    Biometria e Passkeys
                </h2>
                <div className="mt-1 text-sm text-gray-600 mb-6 space-y-2">
                    <p>Faça login usando a impressão digital, reconhecimento facial (FaceID) ou PIN do seu dispositivo sem precisar digitar sua senha longa.</p>
                </div>
            </header>

            <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-6 relative overflow-hidden">
                <div className="absolute right-0 top-0 opacity-10">
                    <svg className="w-48 h-48 rotate-12 outline-none" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2zm0 18a9 9 0 009-9h-2a7 7 0 01-14 0H1a9 9 0 009 9z" />
                    </svg>
                </div>

                <div className="relative z-10">
                    <h3 className="text-xl font-bold text-blue-900 mb-2">Login Móvel & Web Seguro</h3>
                    <p className="text-sm text-blue-800 mb-6 max-w-sm">
                        Esta funcionalidade habilita o pareamento do seu smartphone pelo aplicativo Mobile nativo para login e de sensores locais do seu PC.
                    </p>

                    <div className="p-4 bg-white/60 backdrop-blur-sm rounded-lg border border-blue-200 inline-block">
                        <p className="text-sm font-semibold text-gray-800">Status do Dispositivo Local</p>
                        <p className="text-xs text-gray-600 mt-1 flex items-center">
                            <svg className="w-4 h-4 text-orange-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            O recurso será plenamente ativado assim que o App Mobile entrar em produção.
                        </p>
                    </div>

                    <div className="mt-6 flex items-center space-x-4">
                        <button
                            type="button"
                            disabled
                            className="inline-flex justify-center items-center rounded-md border border-transparent bg-blue-600 py-2 px-4 shadow-sm text-sm font-medium text-white opacity-50 cursor-not-allowed"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                            </svg>
                            Adicionar Sensor Biométrico (Em Breve)
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
