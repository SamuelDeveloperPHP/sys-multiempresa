import { Link } from '@inertiajs/react';

export default function AuthLayout({ children }) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 font-sans antialiased py-12 px-4 sm:px-6">
            <div className="max-w-md w-full bg-white shadow-md rounded-sm overflow-hidden">
                <div className="p-8">
                    <div className="text-center mb-8">
                        <span className="text-4xl font-extrabold text-[#00b393] tracking-tighter">SGA<span className="text-gray-700">-Engeativos</span></span>
                    </div>

                    {children}

                </div>
            </div>
        </div>
    );
}
