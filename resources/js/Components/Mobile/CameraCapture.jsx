// resources/js/Components/Mobile/CameraCapture.jsx
// -----------------------------------------------------------------------------
// Modal full-screen de captura via câmera (getUserMedia API).
// CAMERA-ONLY: NÃO há acesso à galeria. Se o usuário negar permissão, ele NÃO
// consegue capturar nada — propositalmente (regra de negócio do legado).
//
// API:
//   <CameraCapture
//     isOpen={cameraOpen}
//     onClose={() => setCameraOpen(false)}
//     onCapture={(result) => { ... }}
//     facingMode="environment"  // 'environment' (traseira) ou 'user' (frontal)
//     quality={0.7}             // 0-1 (JPEG quality)
//     maxDimension={1920}       // dimensão máxima do lado maior
//   />
//
// result do onCapture:
//   {
//     blob: Blob,           // para armazenar no Dexie
//     dataUrl: string,      // data:image/jpeg;base64,... para <img src>
//     width: number,
//     height: number,
//     size: number,         // bytes
//   }
//
// REQUISITOS:
//   - HTTPS ou localhost (getUserMedia exige contexto seguro)
//   - Dispositivo com câmera
//   - Permissão concedida pelo usuário
// -----------------------------------------------------------------------------

import { useEffect, useRef, useState, useCallback } from 'react';

const STATUS = {
    IDLE: 'idle',
    REQUESTING: 'requesting',
    ACTIVE: 'active',
    DENIED: 'denied',
    NO_DEVICE: 'no_device',
    INSECURE: 'insecure',
    ERROR: 'error',
};

export default function CameraCapture({
    isOpen,
    onClose,
    onCapture,
    facingMode: initialFacingMode = 'environment',
    quality = 0.7,
    maxDimension = 1920,
    title = 'Capturar foto',
}) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    const [status, setStatus] = useState(STATUS.IDLE);
    const [errorMsg, setErrorMsg] = useState('');
    const [facingMode, setFacingMode] = useState(initialFacingMode);
    const [capturing, setCapturing] = useState(false);

    // -------------------------------------------------------------------------
    // Inicia o stream de vídeo
    // -------------------------------------------------------------------------
    const startCamera = useCallback(async (mode = facingMode) => {
        // 1. Verifica contexto seguro (HTTPS)
        if (typeof window !== 'undefined' && !window.isSecureContext) {
            setStatus(STATUS.INSECURE);
            setErrorMsg('Câmera só funciona em HTTPS. Acesse via conexão segura.');
            return;
        }

        // 2. Verifica suporte
        if (!navigator?.mediaDevices?.getUserMedia) {
            setStatus(STATUS.NO_DEVICE);
            setErrorMsg('Este dispositivo não suporta acesso à câmera.');
            return;
        }

        setStatus(STATUS.REQUESTING);
        setErrorMsg('');

        try {
            // Para stream anterior se existir
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
                streamRef.current = null;
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: mode },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
                audio: false,
            });

            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play().catch(() => { /* autoplay pode pedir gesture */ });
            }

            setStatus(STATUS.ACTIVE);
        } catch (err) {
            console.error('[CameraCapture] erro getUserMedia:', err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setStatus(STATUS.DENIED);
                setErrorMsg('Permissão de câmera negada. Habilite no menu do browser e tente novamente.');
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                setStatus(STATUS.NO_DEVICE);
                setErrorMsg('Nenhuma câmera encontrada neste dispositivo.');
            } else {
                setStatus(STATUS.ERROR);
                setErrorMsg(err.message || 'Erro ao acessar a câmera.');
            }
        }
    }, [facingMode]);

    // -------------------------------------------------------------------------
    // Para o stream e libera recursos
    // -------------------------------------------------------------------------
    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setStatus(STATUS.IDLE);
    }, []);

    // -------------------------------------------------------------------------
    // Boot/cleanup ao abrir/fechar
    // -------------------------------------------------------------------------
    useEffect(() => {
        if (isOpen) {
            startCamera(facingMode);
        } else {
            stopCamera();
        }
        return () => stopCamera();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // -------------------------------------------------------------------------
    // Trocar câmera (front <-> back)
    // -------------------------------------------------------------------------
    const switchCamera = async () => {
        const next = facingMode === 'environment' ? 'user' : 'environment';
        setFacingMode(next);
        await startCamera(next);
    };

    // -------------------------------------------------------------------------
    // Captura o frame atual em Blob + data URL
    // -------------------------------------------------------------------------
    const capture = async () => {
        if (capturing || status !== STATUS.ACTIVE) return;
        setCapturing(true);

        try {
            const video = videoRef.current;
            if (!video || !video.videoWidth) {
                throw new Error('Vídeo ainda não está pronto.');
            }

            // Calcula dimensões respeitando maxDimension
            let { videoWidth: w, videoHeight: h } = video;
            const max = Math.max(w, h);
            if (max > maxDimension) {
                const ratio = maxDimension / max;
                w = Math.round(w * ratio);
                h = Math.round(h * ratio);
            }

            // Desenha no canvas
            const canvas = canvasRef.current || document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, w, h);

            // Exporta como Blob (mais eficiente) E como data URL (para preview)
            const blob = await new Promise((resolve) => {
                canvas.toBlob((b) => resolve(b), 'image/jpeg', quality);
            });
            if (!blob) throw new Error('Falha ao gerar imagem.');

            const dataUrl = canvas.toDataURL('image/jpeg', quality);

            onCapture?.({
                blob,
                dataUrl,
                width: w,
                height: h,
                size: blob.size,
            });

            // Não fecha automaticamente — deixa o pai decidir.
            // Tipicamente o pai chama onClose() após processar o resultado.
        } catch (err) {
            console.error('[CameraCapture] erro ao capturar:', err);
            setErrorMsg(err.message || 'Falha ao capturar a foto.');
        } finally {
            setCapturing(false);
        }
    };

    // -------------------------------------------------------------------------
    // Render
    // -------------------------------------------------------------------------
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur text-white">
                <h2 className="text-base font-semibold truncate">{title}</h2>
                <button
                    type="button"
                    onClick={onClose}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                    aria-label="Fechar câmera"
                >
                    <i className="fa-solid fa-xmark text-xl" />
                </button>
            </div>

            {/* Video / Loading / Erro */}
            <div className="flex-1 relative overflow-hidden bg-black">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${status === STATUS.ACTIVE ? 'block' : 'hidden'}`}
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Overlay de status */}
                {status !== STATUS.ACTIVE && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center">
                        {status === STATUS.REQUESTING && (
                            <>
                                <i className="fa-solid fa-camera text-5xl text-[#557bbb] mb-4 animate-pulse" />
                                <p className="text-lg font-medium">Solicitando acesso à câmera…</p>
                                <p className="text-sm text-gray-400 mt-2">
                                    Confirme a permissão no diálogo do navegador.
                                </p>
                            </>
                        )}

                        {status === STATUS.DENIED && (
                            <>
                                <i className="fa-solid fa-ban text-5xl text-red-500 mb-4" />
                                <p className="text-lg font-semibold">Permissão negada</p>
                                <p className="text-sm text-gray-300 mt-2 max-w-sm">{errorMsg}</p>
                                <button
                                    type="button"
                                    onClick={() => startCamera(facingMode)}
                                    className="mt-4 px-5 py-2 bg-[#557bbb] text-white rounded-lg font-medium hover:bg-[#3a5a8c]"
                                >
                                    Tentar novamente
                                </button>
                            </>
                        )}

                        {status === STATUS.NO_DEVICE && (
                            <>
                                <i className="fa-solid fa-camera-rotate text-5xl text-amber-500 mb-4" />
                                <p className="text-lg font-semibold">Câmera não encontrada</p>
                                <p className="text-sm text-gray-300 mt-2 max-w-sm">{errorMsg}</p>
                            </>
                        )}

                        {status === STATUS.INSECURE && (
                            <>
                                <i className="fa-solid fa-lock text-5xl text-amber-500 mb-4" />
                                <p className="text-lg font-semibold">Conexão não segura</p>
                                <p className="text-sm text-gray-300 mt-2 max-w-sm">{errorMsg}</p>
                            </>
                        )}

                        {status === STATUS.ERROR && (
                            <>
                                <i className="fa-solid fa-triangle-exclamation text-5xl text-red-500 mb-4" />
                                <p className="text-lg font-semibold">Erro</p>
                                <p className="text-sm text-gray-300 mt-2 max-w-sm">{errorMsg}</p>
                                <button
                                    type="button"
                                    onClick={() => startCamera(facingMode)}
                                    className="mt-4 px-5 py-2 bg-[#557bbb] text-white rounded-lg font-medium hover:bg-[#3a5a8c]"
                                >
                                    Tentar novamente
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* Quadro de enquadramento (estilo legado) */}
                {status === STATUS.ACTIVE && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="relative w-[80%] max-w-md aspect-square rounded-2xl">
                            {[
                                'top-0 left-0 border-t-4 border-l-4 rounded-tl-2xl',
                                'top-0 right-0 border-t-4 border-r-4 rounded-tr-2xl',
                                'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl',
                                'bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl',
                            ].map((corner, i) => (
                                <div
                                    key={i}
                                    className={`absolute w-12 h-12 border-[#557bbb] ${corner}`}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Controles inferiores */}
            {status === STATUS.ACTIVE && (
                <div className="flex items-center justify-between px-6 py-4 bg-black/80 backdrop-blur">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                        aria-label="Cancelar"
                    >
                        <i className="fa-solid fa-xmark text-xl" />
                    </button>

                    <button
                        type="button"
                        onClick={capture}
                        disabled={capturing}
                        className="w-20 h-20 rounded-full bg-white border-4 border-[#557bbb] flex items-center justify-center shadow-2xl active:scale-95 transition-transform disabled:opacity-50"
                        aria-label="Capturar foto"
                    >
                        {capturing ? (
                            <i className="fa-solid fa-spinner fa-spin text-2xl text-[#557bbb]" />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-[#557bbb]" />
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={switchCamera}
                        className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                        aria-label="Trocar câmera"
                    >
                        <i className="fa-solid fa-camera-rotate text-xl" />
                    </button>
                </div>
            )}
        </div>
    );
}
