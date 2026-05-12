import { useState } from 'react';
import { useForm } from '@inertiajs/react';

export default function GeolocationForm({ className = '', user }) {
    const { data, setData, post, processing, errors, recentlySuccessful } = useForm({
        latitude: user.latitude || '',
        longitude: user.longitude || '',
    });

    const [loadingLocal, setLoadingLocal] = useState(false);
    const [gpsError, setGpsError] = useState('');

    const captureLocation = () => {
        setGpsError('');
        setLoadingLocal(true);

        if (!navigator.geolocation) {
            setGpsError("Seu navegador não suporta geolocalização.");
            setLoadingLocal(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setData(prev => ({
                    ...prev,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                }));
                setLoadingLocal(false);
            },
            (err) => {
                let errorMessage = "Erro desconhecido ao obter localização.";
                if(err.code === 1) errorMessage = "Permissão de localização foi negada.";
                if(err.code === 2) errorMessage = "Posição não disponível no momento.";
                if(err.code === 3) errorMessage = "A requisição da localização expirou (timeout).";
                
                setGpsError(errorMessage);
                setLoadingLocal(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    };

    const submit = (e) => {
        e.preventDefault();
        post(route('profile.location.update'), {
            preserveScroll: true
        });
    };

    return (
        <section className={className}>
            <header>
                <h2 className="text-lg font-medium text-gray-900 border-b border-gray-100 pb-2">
                    Minha Localização Padrão
                </h2>
                <div className="mt-1 text-sm text-gray-600 mb-6 space-y-2">
                    <p>Salve a sua localização base para recursos futuros que exigirem check-in em Obras ou proximidade com escritórios.</p>
                </div>
            </header>

            <form onSubmit={submit} className="mt-6 space-y-6 max-w-xl">
                
                <div className="bg-blue-50 border border-blue-100 text-blue-800 rounded-lg p-4 text-sm flex items-start">
                    <svg className="w-5 h-5 mr-3 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p>
                        Para capturar a sua coordenada correta, você deverá conceder permissão ao seu navegador caso seja solicitado.
                    </p>
                </div>

                {gpsError && (
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 font-medium">
                        {gpsError}
                    </div>
                )}

                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={captureLocation}
                        disabled={loadingLocal || processing}
                        className="inline-flex justify-center items-center rounded-md border border-gray-300 bg-white py-2 px-4 shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#00b393] focus:ring-offset-2 disabled:opacity-50"
                    >
                        {loadingLocal ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Lendo Sensor GPS...
                            </>
                        ) : (
                            <>
                                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Capturar Minha Posição Agora
                            </>
                        )}
                    </button>
                    <a 
                        target="_blank" rel="noreferrer"
                        href={`https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`} 
                        className={`text-sm font-medium text-[#6690f4] hover:underline ${!data.latitude && 'hidden'}`}
                    >
                        Ver no Google Maps
                    </a>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                        <label htmlFor="latitude" className="block text-sm font-medium text-gray-700">Latitude</label>
                        <input
                            id="latitude"
                            type="text"
                            value={data.latitude}
                            onChange={(e) => setData('latitude', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#00b393] focus:ring focus:ring-[#00b393] focus:ring-opacity-50 font-mono text-sm bg-gray-50"
                            readOnly
                        />
                        {errors.latitude && <p className="text-sm text-red-600 mt-2">{errors.latitude}</p>}
                    </div>

                    <div>
                        <label htmlFor="longitude" className="block text-sm font-medium text-gray-700">Longitude</label>
                        <input
                            id="longitude"
                            type="text"
                            value={data.longitude}
                            onChange={(e) => setData('longitude', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#00b393] focus:ring focus:ring-[#00b393] focus:ring-opacity-50 font-mono text-sm bg-gray-50"
                            readOnly
                        />
                        {errors.longitude && <p className="text-sm text-red-600 mt-2">{errors.longitude}</p>}
                    </div>
                </div>

                <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
                    <button 
                        disabled={processing || !data.latitude || !data.longitude} 
                        className="inline-flex justify-center rounded-md border border-transparent bg-[#00b393] py-2 px-6 text-sm font-medium text-white shadow-sm hover:bg-[#009b80] focus:outline-none focus:ring-2 focus:ring-[#00b393] disabled:opacity-50"
                    >
                        Gravar no Perfil
                    </button>

                    {recentlySuccessful && <p className="text-sm text-green-600 font-medium">Gravado com sucesso.</p>}
                </div>
            </form>
        </section>
    );
}
