// resources/js/Components/Mobile/QRCodeOCRScanner.jsx
// -----------------------------------------------------------------------------
// Scanner full-screen de OCR: lê o PREFIXO do veículo (ex: AC-001) pela câmera.
// (O modo QR Code / código de barras foi REMOVIDO a pedido — só OCR.)
//
// A câmera é aberta via html5-qrcode (também usado em outras telas) e o OCR roda
// sobre o <video> gerado, a cada ~1.5s, com tesseract.js. A decodificação de QR
// do html5-qrcode é ignorada — usamos a lib só como fonte de vídeo.
//
// ACURÁCIA (leitura de código curto impresso/estêncil):
//   - Recorta uma FAIXA CENTRAL (mira) do frame, dá zoom e converte p/ cinza+contraste
//   - tesseract com whitelist (A–Z 0–9 -) e PSM de linha única
//   - Extração TOLERANTE: corrige confusões de OCR (O↔0, I↔1, S↔5, B↔8…)
//   OBS: OCR é para texto IMPRESSO/estêncil. Manuscrito não é confiável.
//
// API:
//   <QRCodeOCRScanner isOpen onClose onResult prefixRegex maxLength />
//
// Requer: HTTPS (getUserMedia) · tesseract.js (~2MB 1ª vez) · html5-qrcode
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
const SCANNER_ID = 'ocr-scanner-region';

// Mira: faixa central onde o motorista alinha o prefixo. O recorte do OCR usa
// EXATAMENTE estas proporções (o que está na moldura é o que é lido).
const RETICLE = { wPct: 0.72, hPct: 0.20 };

// Confusões clássicas de OCR na parte NUMÉRICA do prefixo.
const DIGIT_FIX = {
    O: '0', Q: '0', D: '0', I: '1', L: '1', '|': '1',
    Z: '2', S: '5', G: '6', T: '7', B: '8',
};

export default function QRCodeOCRScanner({
    isOpen,
    onClose,
    onResult,
    prefixRegex = DEFAULT_PREFIX_REGEX,
    maxLength = 7,
}) {
    const [status, setStatus] = useState(STATUS.IDLE);
    const [errorMsg, setErrorMsg] = useState('');
    const [ocrText, setOcrText] = useState('');
    const [ocrLoading, setOcrLoading] = useState(false);

    const html5QrRef = useRef(null);
    const tesseractWorkerRef = useRef(null);
    const ocrTimerRef = useRef(null);
    const videoElRef = useRef(null);

    // -------------------------------------------------------------------------
    // Extrai prefixo formatado (LL-NNN ou LLL-NNN), tolerante a erros de OCR.
    // -------------------------------------------------------------------------
    const extractPrefix = useCallback((rawText) => {
        if (!rawText) return null;
        const up = String(rawText).toUpperCase().replace(/[–—]/g, '-');

        let letras = null;
        let num = null;

        // 1) tentativa ESTRITA (regex configurável)
        const strict = up.match(prefixRegex);
        if (strict) {
            const clean = strict[0].replace(/\s+/g, '').replace('-', '');
            letras = clean.replace(/[0-9]/g, '');
            num = clean.replace(/[^0-9]/g, '');
        } else {
            // 2) TOLERANTE: 2-3 letras + separador + 3 chars alfanum → corrige dígitos
            const loose = up.match(/([A-Z]{2,3})\s*-?\s*([A-Z0-9]{3})/);
            if (!loose) return null;
            letras = loose[1];
            num = loose[2].split('').map((c) => DIGIT_FIX[c] ?? c).join('');
        }

        if (!/^[A-Z]{2,3}$/.test(letras) || !/^\d{3}$/.test(num)) return null;

        let prefixo = `${letras}-${num}`;
        if (prefixo.length > maxLength) prefixo = prefixo.substring(0, maxLength);
        return prefixo;
    }, [prefixRegex, maxLength]);

    // -------------------------------------------------------------------------
    // Abre a câmera (via html5-qrcode). O stream é só fonte de vídeo p/ o OCR —
    // QR/código de barras NÃO são processados.
    // -------------------------------------------------------------------------
    const startCamera = useCallback(async () => {
        setStatus(STATUS.REQUESTING);
        setErrorMsg('');

        try {
            const qr = new Html5Qrcode(SCANNER_ID, { verbose: false });
            html5QrRef.current = qr;

            await qr.start(
                { facingMode: 'environment' },
                { fps: 10, aspectRatio: 1.7777 },
                () => { /* QR ignorado — este scanner é só OCR */ },
                () => { /* erro de frame, ignora silenciosamente */ }
            );

            const container = document.getElementById(SCANNER_ID);
            videoElRef.current = container?.querySelector('video') || null;

            setStatus(STATUS.ACTIVE);
        } catch (err) {
            console.error('[OCRScanner] erro câmera:', err);
            const name = err?.name || '';
            if (name === 'NotAllowedError' || /Permission/i.test(String(err))) {
                setStatus(STATUS.DENIED);
                setErrorMsg('Permissão de câmera negada. Habilite no menu do navegador.');
            } else if (name === 'NotFoundError') {
                setStatus(STATUS.NO_DEVICE);
                setErrorMsg('Nenhuma câmera encontrada.');
            } else if (name === 'NotReadableError') {
                setStatus(STATUS.ERROR);
                setErrorMsg('Não foi possível iniciar a câmera (pode estar em uso por outro app).');
            } else {
                setStatus(STATUS.ERROR);
                setErrorMsg(err?.message || String(err) || 'Erro ao iniciar câmera.');
            }
        }
    }, []);

    // -------------------------------------------------------------------------
    // Inicializa o Tesseract worker (lazy) + parâmetros de acurácia
    // -------------------------------------------------------------------------
    const ensureTesseract = useCallback(async () => {
        if (tesseractWorkerRef.current) return tesseractWorkerRef.current;
        setOcrLoading(true);
        try {
            const Tesseract = await loadTesseract();
            const worker = await Tesseract.createWorker('por', 1, {
                // logger: m => console.log('[Tesseract]', m),
            });
            // Só letras/dígitos/hífen e leitura como UMA linha — dispara acurácia
            // em código curto e evita o motor "inventar" símbolos.
            await worker.setParameters({
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-',
                tessedit_pageseg_mode: '7', // PSM_SINGLE_LINE
            });
            tesseractWorkerRef.current = worker;
            return worker;
        } finally {
            setOcrLoading(false);
        }
    }, []);

    // -------------------------------------------------------------------------
    // Captura o recorte da MIRA, pré-processa (zoom + cinza/contraste) e roda OCR
    // -------------------------------------------------------------------------
    const ocrTick = useCallback(async () => {
        const video = videoElRef.current;
        if (!video || video.readyState < 2) return; // HAVE_CURRENT_DATA = 2

        try {
            const vw = video.videoWidth || 640;
            const vh = video.videoHeight || 480;

            // Recorte da faixa central (mesma proporção da mira na tela)
            const cw = Math.round(vw * RETICLE.wPct);
            const ch = Math.round(vh * RETICLE.hPct);
            const sx = Math.round((vw - cw) / 2);
            const sy = Math.round((vh - ch) / 2);
            const scale = 2.5; // zoom p/ ajudar o OCR

            const canvas = document.createElement('canvas');
            canvas.width = Math.round(cw * scale);
            canvas.height = Math.round(ch * scale);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, sx, sy, cw, ch, 0, 0, canvas.width, canvas.height);

            // Escala de cinza + contraste (sem binarização dura, p/ tolerar iluminação)
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const d = imgData.data;
            const contrast = 1.4;
            for (let i = 0; i < d.length; i += 4) {
                let g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
                g = Math.min(255, Math.max(0, (g - 128) * contrast + 128));
                d[i] = d[i + 1] = d[i + 2] = g;
            }
            ctx.putImageData(imgData, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');

            const worker = await ensureTesseract();
            if (!worker) return;

            const result = await worker.recognize(dataUrl);
            const text = result?.data?.text || '';
            setOcrText(text.replace(/\s+/g, ' ').trim().substring(0, 60));

            const prefix = extractPrefix(text);
            if (prefix) {
                onResult?.(prefix, 'ocr');
                closeAll();
            }
        } catch (err) {
            console.warn('[OCRScanner] OCR tick falhou:', err?.message);
        }
    }, [ensureTesseract, extractPrefix, onResult]);

    // -------------------------------------------------------------------------
    // Loop de OCR — roda enquanto a câmera estiver ativa
    // -------------------------------------------------------------------------
    useEffect(() => {
        if (!isOpen || status !== STATUS.ACTIVE) return;

        ensureTesseract(); // carrega o worker antecipadamente

        ocrTimerRef.current = setInterval(() => {
            ocrTick();
        }, OCR_INTERVAL_MS);

        return () => {
            if (ocrTimerRef.current) {
                clearInterval(ocrTimerRef.current);
                ocrTimerRef.current = null;
            }
        };
    }, [isOpen, status, ocrTick, ensureTesseract]);

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
            setTimeout(() => startCamera(), 50); // espera o DOM montar o container
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
                    <h2 className="text-base font-semibold">Ler prefixo</h2>
                    <p className="text-xs text-gray-300">
                        Centralize o prefixo na moldura (ex: AC-001)
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

            {/* Container do scanner (vídeo da câmera) */}
            <div className="flex-1 relative overflow-hidden">
                <div id={SCANNER_ID} className="w-full h-full" />

                {/* Mira central — onde o OCR recorta */}
                {status === STATUS.ACTIVE && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div
                            className="border-2 border-[#557bbb] rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
                            style={{ width: `${RETICLE.wPct * 100}%`, height: `${RETICLE.hPct * 100}%` }}
                        />
                    </div>
                )}

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
                {status === STATUS.ACTIVE && (
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

            {/* Rodapé: só Cancelar (sem toggle de modos) */}
            {status === STATUS.ACTIVE && (
                <div className="px-4 pb-6 pt-4 bg-black/80 backdrop-blur">
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
