import { useForm } from '@inertiajs/react';

export default function Login() {
    const { data, setData, post, processing, errors } = useForm({
        email: '', password: ''
    });

    const submit = (e) => {
        e.preventDefault();
        post('/portal/login');
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 font-sans antialiased py-12 px-4 sm:px-6 w-full">
            <div className="max-w-md w-full bg-white shadow-md rounded-sm overflow-hidden border border-gray-100">
                <div className="p-10">
                    <div className="text-center mb-10">
                        {/* Imitando o logo do RISE CRM */}
                        <div className="flex items-center justify-center justify-items-center mb-2 gap-2">
                             <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 via-blue-500 to-teal-400"></div>
                             <span className="text-4xl font-extrabold text-[#11b8a5] tracking-tight">RISE</span>
                        </div>
                    </div>
                    
                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <input type="email" value={data.email} onChange={e => setData('email', e.target.value)} required autoFocus
                                className="w-full px-4 py-3 bg-[#f8f9fa] border border-gray-100 rounded focus:bg-white focus:ring-1 focus:ring-[#e4e5e7] focus:border-[#e4e5e7] transition-colors outline-none text-gray-600 text-sm placeholder-gray-400" placeholder="admin@demo.com" />
                            {errors.email && <div className="text-red-500 text-xs mt-1 font-medium">{errors.email}</div>}
                        </div>
                        <div>
                            <input type="password" value={data.password} onChange={e => setData('password', e.target.value)} required
                                className="w-full px-4 py-3 bg-[#f8f9fa] border border-gray-100 rounded focus:bg-white focus:ring-1 focus:ring-[#e4e5e7] focus:border-[#e4e5e7] transition-colors outline-none text-gray-600 text-sm placeholder-gray-400" placeholder="••••••••" />
                            {errors.password && <div className="text-red-500 text-xs mt-1 font-medium">{errors.password}</div>}
                        </div>
                        
                        <div className="pt-2">
                            <button disabled={processing} className="w-full bg-[#557bbb] hover:bg-[#5a80d9] text-white font-medium py-3 rounded shadow-sm transition-colors text-sm">
                                {processing ? 'Autenticando...' : 'Sign in'}
                            </button>
                        </div>
                        
                        <div className="flex flex-col space-y-3 pt-4 text-sm text-gray-500">
                            <a href="#" className="text-[#557bbb] hover:underline">Forgot password?</a>
                            <div>You don't have an account? <a href="#" className="text-[#557bbb] hover:underline">Sign up</a></div>
                        </div>
                    </form>
                </div>
            </div>

            {/* Painel de Login Falso Estilo Demonstração RISE */}
            <div className="max-w-md w-full mt-6 bg-white shadow-sm rounded-sm p-6 text-sm text-gray-500 border border-gray-100">
               <div className="text-center font-medium mb-4 text-gray-800">Sign in as</div>
               <div className="flex justify-between border-b pb-2 mb-2">
                   <span>Admin</span>
                   <span className="text-[#557bbb] cursor-pointer hover:underline">admin@demo.com</span>
                   <span>riseDemo</span>
               </div>
               <div className="flex justify-between border-b pb-2 mb-4">
                   <span>Client</span>
                   <span className="text-[#557bbb] cursor-pointer hover:underline">client@demo.com</span>
                   <span>riseDemo</span>
               </div>
               <p className="text-xs text-gray-400 text-center leading-relaxed">
                   To check team members, use the email addresses from the Team members list. Password is same riseDemo.
               </p>
            </div>
        </div>
    );
}
