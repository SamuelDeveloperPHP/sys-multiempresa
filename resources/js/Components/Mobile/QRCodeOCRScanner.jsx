// resources/js/Components/Mobile/QRCodeOCRScanner.jsx
// -----------------------------------------------------------------------------
// Scanner full-screen com 2 modos: QR Code e OCR de texto.
// Port da experiência do legado React Native (vision-camera + OCR plugin)
// para web/PWA usando html5-qrcode (QR) e tesseract.js (OCR).
//
// API:
//   <QRCodeOCRScanner
//     isOpen={open}
//     onClose={() => setOpen(false)}
//     onResult={(text, mode) => { ... }}  // mode: 'qr' | 'ocr'
//     initialMode="qr"
//     prefixRegex={/[A-Z]{2,3}\s*-?\s*\d{3}/i}  // regex para extrair prefixo no OCR
//     maxLength={7}                              // trunca o resultado a N chars
//   />
//
// Comportamento:
//   - Modo QR: lê qualquer QR Code ou código de barras (ean13, code-128, code-39)
//   - Modo OCR: faz OCR contínuo a cada ~1.5s do frame da câmera. Quando o regex
//     achar match, retorna via onResult e fecha automaticamente.
//   - Toggle entre os modos via botões na parte inferior.
//   - Reuso do mesmo stream de vídeo entre os modos (mais eficiente).
//
// Requer:
//   - HTTPS (getUserMedia)
//   - tesseract.js (~2MB primeira vez, depois cached)
//   - html5-qrcode (~50KB)
// -----------------------------------------------------------------------------

import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

// Lazy import pra não inflar o bundle inicial. tesseract.js só carrega ao primeiro OCR.
const loadTesseract = () => import('tesseract.js');

const STATUS = {
    IDLE: 'idle',
    REQUESTING: 'requesting',
    ACTIVE: 'active',
    DENIED: 'denied',
    NO_DEVICE: 'no_device',
    ERROR: 'error',
};

const DEFAULT_PREFIX_REGEX = /[A-Z]{2,3}\s*-?\s*\d{3}/i;
const OCR_INTERVAL_MS = 1500;
const SCANNER_ID = 'qr-ocr-scanner-region';

export default function QRCodeOCRScanner({
    isOpen,
    onClose,
    onResult,
    initialMode = 'qr',
    prefixRegex = DEFAULT_PREFIX_REGEX,
    maxLength = 7,
}) {
    const [mode, setMode] = useState(initialMode);
    const [status, setStatus] = useState(STATUS.IDLE);
    const [errorMsg, setErrorMsg] = useState('');
    const [ocrText, setOcrText] = useState('');
    const [ocrLoading, setOcrLoading] = useState(false);

    const html5QrRef = useRef(null);
    const tesseractWorkerRef = useRef(null);
    const ocrTimerRef = useRef(null);
    const videoElRef = useRef(null);

    // -------------------------------------------------------------------------
    // Helper: extrai prefixo formatado do texto (LL-NNN ou LLL-NNN)
    // -------------------------------------------------------------------------
    const extractPrefix = useCallback((text) => {
        if (!text) return null;
        const match = String(text).match(prefixRegex);
        if (!match) return null;
        let prefixo = match[0].toUpperCase().replace(/\s+/g, '');
        if (!prefixo.includes('-')) {
            const letras = prefixo.replace(/[0-9]/g, '');
            const numeros = prefixo.replace(/[^0-9]/g, '');
            prefixo = `${letras}-${numeros}`;
        }
        if (prefixo.length > maxLength) {
            prefixo = prefixo.substring(0, maxLength);
        }
        return prefixo;
    }, [prefixRegex, maxLength]);

    // -------------------------------------------------------------------------
    // Inicia o html5-qrcode (modo QR + leitura contínua de barras)
    // -------------------------------------------------------------------------
    const startQrScanner = useCallback(async () => {
        setStatus(STATUS.REQUESTING);
        setErrorMsg('');

        try {
            const qr = new Html5Qrcode(SCANNER_ID, { verbose: false });
            html5QrRef.current = qr;

            await qr.start(
                { facingMode: 'environment' },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.7777,
                },
                (decodedText) => {
                    // Sucesso na leitura QR/barcode
                    let result = decodedText;
                    if (maxLength && result.length > maxLength) {
                        result = result.substring(0, maxLength);
                    }
                    onResult?.(result, 'qr');
                    closeAll();
                },
                () => { /* erro de frame, ignora silenciosamente */ }
            );

            // Pega o elemento <video> criado pelo html5-qrcode pra usar no OCR
            const container = document.getElementById(SCANNER_ID);
            videoElRef.current = container?.querySelector('video') || null;

            setStatus(STATUS.ACTIVE);
        } catch (err) {
            console.error('[Scanner] erro QR:', err);
            const name = err?.name || '';
            if (name === 'NotAllowedError' || /Permission/i.test(String(err))) {
                setStatus(STATUS.DENIED);
                setErrorMsg('Permissão de câmera negada. Habilite no menu do navegador.');
            } else if (name === 'NotFoundError') {
                setStatus(STATUS.NO_DEVICE);
                setErrorMsg('Nenhuma câmera encontrada.');
            } else {
                setStatus(STATUS.ERROR);
                setErrorMsg(err?.message || String(err) || 'Erro ao iniciar câmera.');
            }
        }
    }, [onResult, maxLength]);

    // -------------------------------------------------------------------------
    // Inicializa o Tesseract worker (lazy, só na primeira vez)
    // -------------------------------------------------------------------------
    const ensureTesseract = useCallback(async () => {
        if (tesseractWorkerRef.current) return tesseractWorkerRef.current;
        setOcrLoading(true);
        try {
            const Tesseract = await loadTesseract();
            // createWorker pode levar uns segundos no primeiro carregamento
            const worker = await Tesseract.createWorker('por', 1, {
                // Logger silencioso. Habilite para debug.
                // logger: m => console.log('[Tesseract]', m),
            });
            tesseractWorkerRef.current = worker;
            return worker;
        } finally {
            setOcrLoading(false);
        }
    }, []);

    // -------------------------------------------------------------------------
    // Captura um frame do vídeo e roda OCR
    // -------------------------------------------------------------------------
    const ocrTick = useCallback(async () => {
        const video = videoElRef.current;
        if (!video || video.readyState < 2) return; // HAVE_CURRENT_DATA = 2

        try {
            const canvas = document.createElement('canvas');
            const w = video.videoWidth || 640;
            const h = video.videoHeight || 480;
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/png');

            const worker = await ensureTesseract();
            if (!worker || mode !== 'ocr') return;

            const result = await worker.recognize(dataUrl);
            const text = result?.data?.text || '';
            setOcrText(text.substring(0, 100));

            const prefix = extractPrefix(text);
            if (prefix) {
                onResult?.(prefix, 'ocr');
                closeAll();
            }
        } catch (err) {
            console.warn('[Scanner] OCR tick falhou:', err?.message);
        }
    }, [mode, ensureTesseract, extractPrefix, onResult]);

    // -------------------------------------------------------------------------
    // Loop de OCR (intervalo)
    // -------------------------------------------------------------------------
    useEffect(() => {
        if (!isOpen || mode !== 'ocr' || status !== STATUS.ACTIVE) return;

        // Inicia carregamento Tesseract antecipadamente
        ensureTesseract();

        ocrTimerRef.current = setInterval(() => {
            ocrTick();
        }, OCR_INTERVAL_MS);

        return () => {
            if (ocrTimerRef.current) {
                clearInterval(ocrTimerRef.current);
                ocrTimerRef.current = null;
            }
        };
    }, [isOpen, mode, status, ocrTick, ensureTesseract]);

    // -------------------------------------------------------------------------
    // Cleanup e fechar
    // -------------------------------------------------------------------------
    const closeAll = useCallback(async () => {
        if (ocrTimerRef.current) {
            clearInterval(ocrTimerRef.current);
            ocrTimerRef.current = null;
        }
        if (html5QrRef.current) {
            try {
                await html5QrRef.current.stop();
                await html5QrRef.current.clear();
            } catch (_) { /* ignore */ }
            html5QrRef.current = null;
        }
        // Não terminamos o tesseract worker — pode ser reutilizado no próximo open.
        // Liberar via terminateTesseract() apenas no unmount global, se precisar.
        videoElRef.current = null;
        setStatus(STATUS.IDLE);
        setOcrText('');
        onClose?.();
    }, [onClose]);

    // -------------------------------------------------------------------------
    // Boot/cleanup no open
    // -------------------------------------------------------------------------
    useEffect(() => {
        if (isOpen) {
            // Espera o DOM montar o container
            setTimeout(() => startQrScanner(), 50);
        }
        return () => {
            if (html5QrRef.current) {
                try {
                    html5QrRef.current.stop().catch(() => {});
                    html5QrRef.current.clear();
                } catch (_) { /* ignore */ }
                html5QrRef.current = null;
            }
            if (ocrTimerRef.current) {
                clearInterval(ocrTimerRef.current);
                ocrTimerRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // Terminate tesseract worker no unmount permanente do componente
    useEffect(() => {
        return () => {
            if (tesseractWorkerRef.current?.terminate) {
                tesseractWorkerRef.current.terminate().catch(() => {});
                tesseractWorkerRef.current = null;
            }
        };
    }, []);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur text-white">
                <div>
                    <h2 className="text-base font-semibold">
                        {mode === 'qr' ? 'Modo QR Code' : 'Modo OCR'}
                    </h2>
                    <p className="text-xs text-gray-300">
                        {mode === 'qr'
                            ? 'Aponte para o QR Code ou código de barras'
                            : 'Aponte para o prefixo (ex: CM-002)'}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={closeAll}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10"
                    aria-label="Fechar"
                >
                    <i className="fa-solid fa-xmark text-xl" />
                </button>
            </div>

            {/* Container do scanner */}
            <div className="flex-1 relative overflow-hidden">
                <div id={SCANNER_ID} className="w-full h-full" />

                {/* Overlay de status */}
                {status !== STATUS.ACTIVE && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center bg-black/90">
                        {status === STATUS.REQUESTING && (
                            <>
                                <i className="fa-solid fa-camera text-5xl text-[#557bbb] mb-4 animate-pulse" />
                                <p className="text-lg font-medium">Iniciando câmera…</p>
                            </>
                        )}
                        {status === STATUS.DENIED && (
                            <>
                                <i className="fa-solid fa-ban text-5xl text-red-500 mb-4" />
                                <p className="text-lg font-semibold">Permissão negada</p>
                                <p className="text-sm text-gray-300 mt-2 max-w-sm">{errorMsg}</p>
                            </>
                        )}
                        {(status === STATUS.NO_DEVICE || status === STATUS.ERROR) && (
                            <>
                                <i className="fa-solid fa-triangle-exclamation text-5xl text-amber-500 mb-4" />
                                <p className="text-lg font-semibold">
                                    {status === STATUS.NO_DEVICE ? 'Câmera não encontrada' : 'Erro'}
                                </p>
                                <p className="text-sm text-gray-300 mt-2 max-w-sm">{errorMsg}</p>
                            </>
                        )}
                    </div>
                )}

                {/* Feedback OCR (texto encontrado em tempo real) */}
                {status === STATUS.ACTIVE && mode === 'ocr' && (
                    <div className="absolute top-2 left-2 right-2 bg-black/70 text-white p-2 rounded text-xs">
                        {ocrLoading && (
                            <p className="text-amber-300">
                                <i className="fa-solid fa-spinner fa-spin mr-1" />
                                Carregando OCR…
                            </p>
                        )}
                        {ocrText && (
                            <p className="text-gray-200 truncate">
                                Detectado: <span className="font-mono">{ocrText}</span>
                            </p>
                        )}
                        {!ocrLoading && !ocrText && (
                            <p className="text-gray-400">
                                <i className="fa-solid fa-magnifying-glass mr-1" />
                                Procurando prefixo…
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Toggle de modos + cancelar */}
            {status === STATUS.ACTIVE && (
                <div className="px-4 pb-6 pt-4 bg-black/80 backdrop-blur space-y-3">
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setMode('qr')}
                            className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                                mode === 'qr'
                                    ? 'bg-[#557bbb] text-white'
                                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                            }`}
                        >
                            <i className="fa-solid fa-qrcode mr-2" />
                            QR Code
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('ocr')}
                            className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                                mode === 'ocr'
                                    ? 'bg-[#557bbb] text-white'
                                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                            }`}
                        >
                            <i className="fa-solid fa-font mr-2" />
                            Texto (OCR)
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={closeAll}
                        className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
                    >
                        <i className="fa-solid fa-xmark mr-2" />
                        Cancelar
                    </button>
                </div>
            )}
        </div>
    );
}
