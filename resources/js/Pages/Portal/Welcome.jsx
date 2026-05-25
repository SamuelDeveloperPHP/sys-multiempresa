import { Head, Link } from '@inertiajs/react';

export default function Welcome({ auth, canLogin, canRegister }) {
    return (
        <>
            <Head title="Bem-vindo ao Engeativos" />

            <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-[#557bbb] selection:text-white">
                {/* Navbar / Header */}
                <header className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 transition-all">
                    <div className="w-full px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center h-20">
                            {/* Logo Area */}
                            <Link href="/" className="flex-shrink-0 flex items-center gap-3 cursor-pointer group">
                                <img
                                    src="/imagens/logos/splash.png"
                                    alt="SGA Engeativos"
                                    className="h-12 w-auto group-hover:scale-105 transition-transform duration-300"
                                />
                            </Link>

                            {/* Authentication Links */}
                            <nav className="flex items-center gap-4 hidden sm:flex">
                                {auth.user ? (
                                    <Link
                                        href={route('dashboard')}
                                        className="font-medium text-sm text-gray-600 hover:text-[#557bbb] transition-colors px-4 py-2 hover:bg-[#eef2f9] rounded-full"
                                    >
                                        Acessar Central
                                    </Link>
                                ) : (
                                    <>
                                        <Link
                                            href={route('login')}
                                            className="font-medium text-sm text-gray-600 hover:text-[#557bbb] transition-colors px-4 py-2 hover:bg-[#eef2f9] rounded-full"
                                        >
                                            Entrar
                                        </Link>

                                        {canRegister && (
                                            <Link
                                                href={route('register')}
                                                className="font-semibold text-sm bg-gray-900 text-white hover:bg-[#557bbb] transition-all duration-300 px-6 py-2.5 rounded-full shadow-md hover:shadow-lg hover:-translate-y-0.5"
                                            >
                                                Cadastre-se
                                            </Link>
                                        )}
                                    </>
                                )}
                            </nav>
                        </div>
                    </div>
                </header>

                {/* Hero Section */}
                <main className="pt-32 pb-16 sm:pt-40 sm:pb-24 lg:pb-32 overflow-hidden">
                    <div className="relative w-full px-4 sm:px-6 lg:px-8 text-center">
                        {/* Background Decorative Blobs */}
                        <div className="absolute top-0 -translate-y-12 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-tr from-[#557bbb]/20 to-[#557bbb]/20 blur-[100px] rounded-full pointer-events-none -z-10"></div>

                        <h1 className="mx-auto max-w-4xl font-extrabold text-5xl tracking-tight text-slate-900 sm:text-7xl mb-8 leading-tight">
                            Gestão multiempresa e obras{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3a5a8c] to-[#557bbb]">
                                inteligente e unificada.
                            </span>
                        </h1>

                        <p className="mx-auto max-w-3xl text-lg tracking-tight text-slate-600 mb-10 leading-relaxed">
                            Plataforma multiempresa que integra <strong className="text-slate-800">frota, ativos, obras, equipes, fornecedores, qualidade, segurança do trabalho e meio ambiente</strong> em uma experiência mobile-first com operação off-line e painéis em tempo real.
                        </p>

                        <div className="flex justify-center gap-4 flex-col sm:flex-row">
                            {auth.user ? (
                                <Link
                                    href={route('dashboard')}
                                    className="inline-flex justify-center items-center gap-2 bg-[#557bbb] hover:bg-[#3a5a8c] text-white font-semibold text-lg px-8 py-3.5 rounded-full transition-all shadow-lg shadow-[#557bbb]/30 hover:shadow-xl hover:-translate-y-1"
                                >
                                    Ir para a Central
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={route('login')}
                                        className="inline-flex justify-center items-center gap-2 bg-[#557bbb] hover:bg-[#3a5a8c] text-white font-semibold text-lg px-8 py-3.5 rounded-full transition-all shadow-lg shadow-[#557bbb]/30 hover:shadow-xl hover:-translate-y-1"
                                    >
                                        Acessar o Sistema
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                    </Link>
                                    <Link
                                        href={route('register')}
                                        className="inline-flex justify-center items-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-900 font-semibold text-lg px-8 py-3.5 rounded-full transition-all shadow-sm hover:shadow-md hover:-translate-y-1"
                                    >
                                        Criar Conta
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Features Grid */}
                    <div className="mt-24 w-full px-4 sm:px-6 lg:px-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            
                            {/* Feature 1 */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-[#bccae7] transition-all duration-300 group">
                                <div className="w-12 h-12 bg-[#eef2f9] rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <svg className="w-6 h-6 text-[#557bbb]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Isolamento Multi-Tenant</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    Dados rigidamente isolados por painel corporativo com segurança nível banco de dados.
                                </p>
                            </div>

                            {/* Feature 2: Obras */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-[#bccae7] transition-all duration-300 group">
                                <div className="w-12 h-12 bg-[#f0f4ff] rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <svg className="w-6 h-6 text-[#557bbb]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Gestão de Obras</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    Controle e acompanhamento de ponta a ponta dos canteiros de obras e projetos.
                                </p>
                            </div>

                            {/* Feature 3: Frotas */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-[#bccae7] transition-all duration-300 group">
                                <div className="w-12 h-12 bg-[#fdf4ff] rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <svg className="w-6 h-6 text-[#d946ef]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Gerenciamento de Frotas</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    Manutenção, rastreamento e controle logístico completo dos veículos.
                                </p>
                            </div>

                            {/* Feature 4: Ativos */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-[#bccae7] transition-all duration-300 group">
                                <div className="w-12 h-12 bg-[#fffbeb] rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <svg className="w-6 h-6 text-[#f59e0b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4v10l8 4 8-4V7z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Gerenciamento de Ativos</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    Mapeamento estruturado de maquinário, ferramentas e ativos da empresa.
                                </p>
                            </div>

                            {/* Feature 5: Equipes */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-[#bccae7] transition-all duration-300 group">
                                <div className="w-12 h-12 bg-[#f3f4f6] rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <svg className="w-6 h-6 text-[#4b5563]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Gerenciamento de Equipes</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    Alocação de colaboradores, jornada de trabalho e escalas otimizadas.
                                </p>
                            </div>

                            {/* Feature 6: Fornecedores */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-[#bccae7] transition-all duration-300 group">
                                <div className="w-12 h-12 bg-[#ecfdf5] rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <svg className="w-6 h-6 text-[#10b981]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Fornecedores</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    Homologação, histórico de compras e avaliação contínua de fornecedores.
                                </p>
                            </div>

                            {/* Feature 7: Qualidade */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-[#bccae7] transition-all duration-300 group">
                                <div className="w-12 h-12 bg-[#eff6ff] rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <svg className="w-6 h-6 text-[#3b82f6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Qualidade</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    Inspeções padronizadas, normas e aferição contínua dos índices de qualidade.
                                </p>
                            </div>

                            {/* Feature 8: Segurança do Trabalho */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-[#bccae7] transition-all duration-300 group">
                                <div className="w-12 h-12 bg-[#fef2f2] rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <svg className="w-6 h-6 text-[#ef4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Segurança do Trabalho</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    Controle de EPIs, treinamentos (NRs) e conformidade para risco zero.
                                </p>
                            </div>

                            {/* Feature 9: Meio Ambiente */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-[#bccae7] transition-all duration-300 group">
                                <div className="w-12 h-12 bg-[#f0fdf4] rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <svg className="w-6 h-6 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Meio Ambiente</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    Gestão de resíduos, licenças ambientais e práticas sustentáveis verificáveis.
                                </p>
                            </div>

                            {/* Feature 10: Autenticação Avançada */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-[#bccae7] transition-all duration-300 group">
                                <div className="w-12 h-12 bg-[#fff5f0] rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <svg className="w-6 h-6 text-[#f57442]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Autenticação 2FA / WebAuthn</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    Login seguro com múltiplos fatores e biometria habilitada para App Mobile.
                                </p>
                            </div>

                            {/* Feature 11: App Engeativos */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-[#bccae7] transition-all duration-300 group">
                                <div className="w-12 h-12 bg-[#f4f0ff] rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <svg className="w-6 h-6 text-[#8b5cf6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">App Engeativos (Off-line)</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    Aplicativo Mobile completo operando com predominância off-line para o trabalho em campo.
                                </p>
                            </div>

                            {/* Feature 12: Dashboards e Relatórios */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-[#bccae7] transition-all duration-300 group">
                                <div className="w-12 h-12 bg-[#f0f9ff] rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <svg className="w-6 h-6 text-[#0ea5e9]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Painéis Gerenciais</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    Acompanhamento estratégico em tempo real via Dashboards unificados e relatórios inteligentes.
                                </p>
                            </div>

                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="border-t border-gray-200 bg-white">
                    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">SGA<span className="text-[#557bbb]"> ENGEATIVOS</span></span>
                            <span className="text-gray-400 text-sm">© {new Date().getFullYear()}. Todos os direitos reservados.</span>
                        </div>
                        <div className="text-sm text-gray-500">
                            Construído com Laravel v{window?.Laravel?.version || '12'} e React 19.
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
