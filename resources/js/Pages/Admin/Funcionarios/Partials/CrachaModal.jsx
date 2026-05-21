/**
 * CrachaModal — Editor de imagem full-screen (estilo Paint/Canva)
 *
 * Recursos:
 *  - Upload de imagem dentro da própria modal (drag&drop ou clique)
 *  - Adicionar/editar texto: font-family, font-size, cor
 *  - Redimensionar a imagem selecionada em pixels ou porcentagem
 *  - Apagar elemento selecionado
 *  - Baixar PNG ou salvar como foto do funcionário (endpoint backend)
 *
 * Dependência: fabric ^6.x (já listado no package.json).
 * Caso fabric não esteja instalado ainda, exibimos fallback amigável.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';

const FONT_FAMILIES = [
    'Arial', 'Helvetica', 'Verdana', 'Tahoma', 'Trebuchet MS',
    'Times New Roman', 'Georgia', 'Courier New', 'Impact', 'Comic Sans MS',
];

// Dimensões oficiais do crachá (herdadas do legado engeativos2-main).
// Não mudar sem realinhar todas as posições percentuais abaixo.
const CANVAS_W = 640;
const CANVAS_H = 1006;

// Caminho do template PNG (640x1006). Se não existir, canvas usa fundo branco.
const TEMPLATE_URL = '/imagens/cracha/cracha_v00.png';

/** Posições relativas (% do template) — do legado index-styles.blade.php */
const TEMPLATE = {
    foto:    { topPct: 0.228,  leftPct: 0.2372, widthPct: 0.679 },           // ~434px de largura
    qrcode:  { topPct: 0.715,  leftPct: 0.025,  size: 170 },
    nome:    { topPct: 0.707,  leftPct: 0.315,  fontSize: 57, color: '#000000', italic: false, bold: true },
    funcao:  { topPct: 0.778,  leftPct: 0.315,  fontSize: 50, color: '#ff5205', italic: true,  bold: false },
    setor:   { topPct: 0.847,  leftPct: 0.315,  fontSize: 50, color: '#000000', italic: true,  bold: false },
};

/**
 * Resolve a URL real da foto do funcionário tentando múltiplos paths conhecidos.
 * Retorna a primeira URL que carrega com sucesso, ou null se nenhuma existir.
 * Falha silenciosamente — sem logs no console.
 */
async function resolveFuncionarioPhotoUrl(funcionario) {
    const raw = funcionario?.imagem_usuario;
    if (! raw) return null;

    // URL absoluta já pronta
    if (/^https?:\/\//i.test(raw)) {
        return (await testImage(raw)) ? raw : null;
    }

    // Path relativo já com diretório (ex: "uploads/usuarios/12/foto.png")
    if (raw.includes('/')) {
        const cleaned = '/' + raw.replace(/^\/+/, '');
        return (await testImage(cleaned)) ? cleaned : null;
    }

    // Apenas nome de arquivo — tenta candidatos comuns na ordem
    const filename = raw;
    const id = funcionario?.id;
    const candidates = [
        `/storage/uploads/usuarios/${id}/${filename}`,
        `/uploads/usuarios/${id}/${filename}`,
        `/imagens/funcionarios/${id}/${filename}`,
        `/imagens/funcionarios/${filename}`,
        `/${id}/${filename}`, // padrão legado
    ];

    for (const url of candidates) {
        if (await testImage(url)) return url;
    }
    return null;
}

/** Carrega uma URL como Image; resolve true se OK, false em qualquer erro. */
function testImage(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload  = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
    });
}

export default function CrachaModal({ isOpen, onClose, funcionario }) {
    const canvasElRef = useRef(null);
    const fabricRef   = useRef(null);   // instância Fabric.Canvas
    const fileInputRef = useRef(null);

    const [fabricReady, setFabricReady] = useState(false);
    const [loadError,   setLoadError]   = useState(null);
    const [saving,      setSaving]      = useState(false);
    const [removingBg,  setRemovingBg]  = useState(false);
    const [removeBgProgress, setRemoveBgProgress] = useState(0); // 0..100

    // Zoom do canvas (1.0 = 100%). Inicia em 60% para caber em viewports comuns.
    const [zoom, setZoom] = useState(0.6);
    const mainRef = useRef(null);   // container central (para fit-to-screen)

    // Estado do elemento selecionado (para painel de propriedades)
    const [selection, setSelection] = useState(null); // { type, width, height, scale, fontFamily, fontSize, fill }

    // ----------------------------------------------------------------
    // Init Fabric.js dinamicamente (lazy import → não quebra build se faltar)
    // ----------------------------------------------------------------
    useEffect(() => {
        if (! isOpen) return;

        let canceled = false;

        (async () => {
            try {
                const fabricMod = await import('fabric');
                if (canceled) return;

                const fabric = fabricMod;       // v6+ exporta named members
                fabricRef.current = { fabric, instance: null };

                // Cria canvas
                const canvas = new fabric.Canvas(canvasElRef.current, {
                    width: CANVAS_W,
                    height: CANVAS_H,
                    backgroundColor: '#ffffff',
                    preserveObjectStacking: true,
                });
                fabricRef.current.instance = canvas;

                // Sincroniza painel de propriedades com seleção
                const syncSelection = () => {
                    const obj = canvas.getActiveObject();
                    if (! obj) { setSelection(null); return; }
                    const isText  = obj.type === 'i-text' || obj.type === 'textbox' || obj.type === 'text';
                    const w = Math.round((obj.width  || 0) * (obj.scaleX || 1));
                    const h = Math.round((obj.height || 0) * (obj.scaleY || 1));
                    setSelection({
                        type:       obj.type,
                        isText,
                        width:      w,
                        height:     h,
                        scalePct:   Math.round((obj.scaleX || 1) * 100),
                        fontFamily: obj.fontFamily || 'Arial',
                        fontSize:   obj.fontSize   || 32,
                        fill:       obj.fill       || '#000000',
                    });
                };

                canvas.on('selection:created', syncSelection);
                canvas.on('selection:updated', syncSelection);
                canvas.on('selection:cleared', () => setSelection(null));
                canvas.on('object:scaling',    syncSelection);
                canvas.on('object:modified',   syncSelection);

                // Zoom via scroll do mouse — Ctrl/Cmd dá mais precisão (1%); sem modificador, 5%
                canvas.on('mouse:wheel', (opt) => {
                    const e = opt.e;
                    const step = e.ctrlKey || e.metaKey ? 0.01 : 0.05;
                    const direction = e.deltaY < 0 ? 1 : -1;
                    setZoom((prev) => {
                        const next = Math.min(2, Math.max(0.1, prev + direction * step));
                        return Number(next.toFixed(2));
                    });
                    e.preventDefault();
                    e.stopPropagation();
                });

                // ESC para fechar
                const onKey = (e) => {
                    if (e.key === 'Escape') onClose();
                    if (e.key === 'Delete' || e.key === 'Backspace') {
                        const o = canvas.getActiveObject();
                        if (o && !(o.isEditing)) {
                            canvas.remove(o);
                            canvas.requestRenderAll();
                        }
                    }
                };
                window.addEventListener('keydown', onKey);

                setFabricReady(true);

                return () => {
                    window.removeEventListener('keydown', onKey);
                    canvas.dispose();
                };
            } catch (e) {
                console.error('Falha ao carregar fabric.js', e);
                setLoadError('Editor não disponível. Execute: npm install fabric');
            }
        })();

        return () => { canceled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // Reset ao fechar
    useEffect(() => {
        if (! isOpen) {
            setFabricReady(false);
            setSelection(null);
            setLoadError(null);
            setZoom(0.6);
            if (fabricRef.current?.instance) {
                try { fabricRef.current.instance.dispose(); } catch (_) {}
                fabricRef.current = null;
            }
        }
    }, [isOpen]);

    // Aplica o zoom no canvas (escala visual + tamanho DOM)
    useEffect(() => {
        const inst = fabricRef.current?.instance;
        if (! inst) return;
        inst.setZoom(zoom);
        inst.setDimensions({ width: CANVAS_W * zoom, height: CANVAS_H * zoom });
        inst.requestRenderAll();
    }, [zoom, fabricReady]);

    /** Calcula zoom que faz o canvas caber inteiro no container central. */
    const fitToScreen = useCallback(() => {
        const el = mainRef.current;
        if (! el) return;
        const padX = 48; // padding/scrollbar
        const padY = 48;
        const availW = el.clientWidth  - padX;
        const availH = el.clientHeight - padY;
        const ratio  = Math.min(availW / CANVAS_W, availH / CANVAS_H);
        setZoom(Number(Math.max(0.1, Math.min(2, ratio)).toFixed(2)));
    }, []);

    // Faz fit-to-screen automaticamente quando o canvas terminar de inicializar
    useEffect(() => {
        if (fabricReady) {
            // pequeno delay para que mainRef já tenha layout final
            const t = setTimeout(fitToScreen, 50);
            return () => clearTimeout(t);
        }
    }, [fabricReady, fitToScreen]);

    // ----------------------------------------------------------------
    // Ações da toolbar
    // ----------------------------------------------------------------
    const addImage = useCallback((dataUrl) => {
        const ref = fabricRef.current;
        if (! ref?.instance) return;
        const { fabric, instance } = ref;

        // v6: FabricImage.fromURL retorna Promise
        fabric.FabricImage.fromURL(dataUrl, { crossOrigin: 'anonymous' }).then((img) => {
            const max = Math.min(CANVAS_W * 0.7 / img.width, CANVAS_H * 0.5 / img.height, 1);
            img.scale(max);
            img.set({ left: CANVAS_W / 2 - (img.width * max) / 2, top: 60 });
            // Em Fabric v6, canvas.add() retorna number — não dá pra encadear.
            instance.add(img);
            instance.setActiveObject(img);
            instance.requestRenderAll();
        }).catch(err => {
            console.error(err);
            alert('Falha ao carregar imagem.');
        });
    }, []);

    const handleFile = (e) => {
        const file = e.target.files?.[0];
        if (! file) return;
        const reader = new FileReader();
        reader.onload = (ev) => addImage(ev.target.result);
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const addText = () => {
        const ref = fabricRef.current;
        if (! ref?.instance) return;
        const { fabric, instance } = ref;

        const text = new fabric.IText('Texto', {
            left: CANVAS_W / 2,
            top:  CANVAS_H / 2,
            originX: 'center',
            originY: 'center',
            fontFamily: 'Arial',
            fontSize:   40,
            fill: '#000000',
            editable: true,
        });
        instance.add(text);
        instance.setActiveObject(text);
        instance.requestRenderAll();
    };

    const updateSelectedProp = (prop, value) => {
        const inst = fabricRef.current?.instance;
        const obj  = inst?.getActiveObject();
        if (! obj) return;

        if (prop === 'fontFamily' || prop === 'fontSize' || prop === 'fill') {
            obj.set(prop, value);
        } else if (prop === 'width') {
            const newW = Number(value) || 1;
            obj.scaleX = newW / (obj.width || 1);
            // mantém proporção
            obj.scaleY = obj.scaleX;
        } else if (prop === 'height') {
            const newH = Number(value) || 1;
            obj.scaleY = newH / (obj.height || 1);
            obj.scaleX = obj.scaleY;
        } else if (prop === 'scalePct') {
            const s = (Number(value) || 1) / 100;
            obj.scale(s);
        }
        obj.setCoords();
        inst.requestRenderAll();

        // Reflete no estado
        setSelection(prev => prev ? {
            ...prev,
            [prop]:     value,
            width:      Math.round((obj.width  || 0) * (obj.scaleX || 1)),
            height:     Math.round((obj.height || 0) * (obj.scaleY || 1)),
            scalePct:   Math.round((obj.scaleX || 1) * 100),
        } : prev);
    };

    const deleteSelected = () => {
        const inst = fabricRef.current?.instance;
        const obj  = inst?.getActiveObject();
        if (! obj) return;
        inst.remove(obj);
        inst.requestRenderAll();
    };

    /**
     * Remove o fundo da imagem selecionada (executa no browser via WebAssembly).
     * Substitui a FabricImage no canvas, preservando posição/escala/rotação.
     */
    const removeBackgroundOfSelected = useCallback(async () => {
        const ref = fabricRef.current;
        const inst = ref?.instance;
        const obj  = inst?.getActiveObject();
        if (! ref || ! inst || ! obj) return;

        // Só funciona em imagens
        const isImage = obj.type === 'image' || obj.type === 'FabricImage' || obj.getSrc;
        if (! isImage) {
            alert('Selecione uma imagem para remover o fundo.');
            return;
        }

        try {
            setRemovingBg(true);
            setRemoveBgProgress(0);

            // Lazy import — o pacote baixa modelos ONNX na 1ª execução (~50MB)
            const { removeBackground } = await import('@imgly/background-removal');

            // Pega a src atual da imagem fabric
            const src = (typeof obj.getSrc === 'function' ? obj.getSrc() : obj._element?.src) || obj.src;
            if (! src) throw new Error('Imagem sem origem (src) disponível.');

            const blob = await removeBackground(src, {
                progress: (_key, current, total) => {
                    if (total > 0) setRemoveBgProgress(Math.round((current / total) * 100));
                },
            });

            // Converte Blob → data URL
            const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload  = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });

            // Preserva posição/escala/rotação da imagem original
            const { fabric } = ref;
            const newImg = await fabric.FabricImage.fromURL(dataUrl, { crossOrigin: 'anonymous' });
            newImg.set({
                left:    obj.left,
                top:     obj.top,
                scaleX:  obj.scaleX,
                scaleY:  obj.scaleY,
                angle:   obj.angle,
                originX: obj.originX,
                originY: obj.originY,
                flipX:   obj.flipX,
                flipY:   obj.flipY,
            });

            inst.remove(obj);
            inst.add(newImg);
            inst.setActiveObject(newImg);
            inst.requestRenderAll();
        } catch (err) {
            console.error('Falha ao remover fundo:', err);
            alert('Não foi possível remover o fundo. Tente outra imagem ou verifique a conexão (modelos são baixados na primeira execução).');
        } finally {
            setRemovingBg(false);
            setRemoveBgProgress(0);
        }
    }, []);

    const clearCanvas = () => {
        if (! confirm('Limpar todos os elementos do canvas?')) return;
        fabricRef.current?.instance?.clear();
        fabricRef.current?.instance?.set('backgroundColor', '#ffffff');
        fabricRef.current?.instance?.requestRenderAll();
    };

    /**
     * Aplica o template oficial do crachá (640x1006):
     *  - Fundo: /imagens/cracha/cracha_v00.png
     *  - Foto do funcionário (se houver imagem_usuario)
     *  - QR Code apontando para /detalhes/funcionario/{id}
     *  - Nome, Função e Setor pré-posicionados nas % do legado
     */
    const applyOfficialTemplate = useCallback(async () => {
        const ref = fabricRef.current;
        if (! ref?.instance) return;
        const { fabric, instance } = ref;

        // Limpa qualquer conteúdo prévio
        instance.clear();
        instance.set('backgroundColor', '#ffffff');

        // 1. Background do template — usa setBackgroundImage; falha silenciosa se PNG ausente
        try {
            const bg = await fabric.FabricImage.fromURL(TEMPLATE_URL, { crossOrigin: 'anonymous' });
            bg.scaleX = CANVAS_W / bg.width;
            bg.scaleY = CANVAS_H / bg.height;
            instance.backgroundImage = bg;
        } catch (e) {
            console.warn('Template cracha_v00.png não encontrado em /imagens/cracha/. Canvas usará fundo branco.', e);
        }

        // 2. Foto do funcionário (se existir) — resolve URL real e falha silenciosamente
        const photoUrl = await resolveFuncionarioPhotoUrl(funcionario);
        if (photoUrl) {
            try {
                const photo = await fabric.FabricImage.fromURL(photoUrl, { crossOrigin: 'anonymous' });
                const targetW = CANVAS_W * TEMPLATE.foto.widthPct;
                const scale   = targetW / photo.width;
                photo.set({
                    left:    CANVAS_W * TEMPLATE.foto.leftPct,
                    top:     CANVAS_H * TEMPLATE.foto.topPct,
                    scaleX:  scale,
                    scaleY:  scale,
                    originX: 'left',
                    originY: 'top',
                });
                instance.add(photo);
            } catch (_) {
                // Sem foto disponível — o usuário pode adicionar via toolbar "Imagem"
            }
        }

        // 3. QR Code apontando para a página pública do funcionário
        try {
            const QRCode = (await import('qrcode')).default;
            const publicUrl = `${window.location.origin}/detalhes/funcionario/${funcionario?.id || 0}`;
            const qrDataUrl = await QRCode.toDataURL(publicUrl, {
                width: TEMPLATE.qrcode.size,
                margin: 1,
                errorCorrectionLevel: 'H',
            });
            const qrImg = await fabric.FabricImage.fromURL(qrDataUrl, { crossOrigin: 'anonymous' });
            qrImg.set({
                left:    CANVAS_W * TEMPLATE.qrcode.leftPct,
                top:     CANVAS_H * TEMPLATE.qrcode.topPct,
                scaleX:  TEMPLATE.qrcode.size / qrImg.width,
                scaleY:  TEMPLATE.qrcode.size / qrImg.height,
                originX: 'left',
                originY: 'top',
            });
            instance.add(qrImg);
        } catch (e) {
            console.warn('Falha ao gerar QR Code:', e);
        }

        // 4. Textos (nome, função, setor)
        const addLabel = (cfg, content) => {
            if (! content) return;
            const txt = new fabric.IText(content, {
                left:       CANVAS_W * cfg.leftPct,
                top:        CANVAS_H * cfg.topPct,
                originX:    'left',
                originY:    'top',
                fontFamily: 'Barlow Condensed, Inter, sans-serif',
                fontSize:   cfg.fontSize,
                fontStyle:  cfg.italic ? 'italic' : 'normal',
                fontWeight: cfg.bold ? 'bold' : 'normal',
                fill:       cfg.color,
                editable:   true,
            });
            instance.add(txt);
        };

        addLabel(TEMPLATE.nome,   (funcionario?.nome || '').toUpperCase());
        addLabel(TEMPLATE.funcao, funcionario?.funcao?.funcao || '');
        addLabel(TEMPLATE.setor,  funcionario?.setor?.nome_setor || '');

        instance.requestRenderAll();
    }, [funcionario]);

    // Aplica o template automaticamente assim que o canvas estiver pronto + funcionario presente
    useEffect(() => {
        if (fabricReady && funcionario?.id) {
            applyOfficialTemplate();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fabricReady]);

    // ----------------------------------------------------------------
    // Download / Salvar como foto do funcionário
    // ----------------------------------------------------------------
    const exportDataUrl = () => {
        const inst = fabricRef.current?.instance;
        if (! inst) return null;
        inst.discardActiveObject();

        // Salva estado atual do zoom/dimensões e força tamanho real (1.0) para o export
        const prevZoom = inst.getZoom();
        const prevDims = { width: inst.getWidth(), height: inst.getHeight() };

        inst.setZoom(1);
        inst.setDimensions({ width: CANVAS_W, height: CANVAS_H });
        inst.requestRenderAll();

        const dataUrl = inst.toDataURL({ format: 'png', multiplier: 2, quality: 1 });

        // Restaura zoom anterior para a UI continuar coerente
        inst.setZoom(prevZoom);
        inst.setDimensions(prevDims);
        inst.requestRenderAll();

        return dataUrl;
    };

    const handleDownload = () => {
        const url = exportDataUrl();
        if (! url) return;
        const a = document.createElement('a');
        a.href = url;
        a.download = `cracha_${funcionario.nome?.replace(/\s+/g, '_') || 'funcionario'}.png`;
        a.click();
    };

    const handleSaveAsProfile = () => {
        if (! funcionario?.id) {
            alert('Funcionário inválido.');
            return;
        }
        const url = exportDataUrl();
        if (! url) return;

        setSaving(true);
        router.post(route('admin.funcionarios.salvar_foto', funcionario.id), {
            image: url,
        }, {
            preserveScroll: true,
            onSuccess: () => { setSaving(false); onClose(); },
            onError:   () => { setSaving(false); alert('Falha ao salvar foto.'); },
        });
    };

    // ----------------------------------------------------------------
    // Render
    // ----------------------------------------------------------------
    if (! isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] bg-gray-900/90 flex flex-col">
            {/* HEADER */}
            <div className="flex items-center justify-between px-6 py-3 bg-gray-800 text-white shadow">
                <div className="flex items-center gap-3">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                              d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" />
                    </svg>
                    <h2 className="text-lg font-semibold">Editor de Crachá / Foto</h2>
                    <span className="text-sm text-gray-400">— {funcionario?.nome}</span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded hover:bg-gray-700"
                    title="Fechar (ESC)"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* BODY */}
            <div className="flex-1 flex overflow-hidden">
                {/* TOOLBAR ESQUERDA */}
                <aside className="w-64 bg-gray-100 border-r border-gray-200 overflow-y-auto p-4 space-y-4">
                    <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Adicionar</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex flex-col items-center justify-center p-3 bg-white border border-gray-300 rounded hover:border-indigo-500 hover:bg-indigo-50 text-xs text-gray-700"
                            >
                                <svg className="w-6 h-6 mb-1 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Imagem
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFile}
                                className="hidden"
                            />

                            <button
                                onClick={addText}
                                className="flex flex-col items-center justify-center p-3 bg-white border border-gray-300 rounded hover:border-indigo-500 hover:bg-indigo-50 text-xs text-gray-700"
                            >
                                <svg className="w-6 h-6 mb-1 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
                                </svg>
                                Texto
                            </button>
                        </div>
                    </div>

                    {/* PROPRIEDADES DO OBJETO SELECIONADO */}
                    {selection && (
                        <div className="border-t border-gray-300 pt-4 space-y-3">
                            <h3 className="text-xs font-bold text-gray-500 uppercase">
                                Propriedades — {selection.isText ? 'Texto' : 'Imagem'}
                            </h3>

                            {/* Texto */}
                            {selection.isText && (
                                <>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Fonte</label>
                                        <select
                                            value={selection.fontFamily}
                                            onChange={(e) => updateSelectedProp('fontFamily', e.target.value)}
                                            className="w-full text-sm rounded border-gray-300"
                                        >
                                            {FONT_FAMILIES.map(f => (
                                                <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Tamanho ({selection.fontSize}px)</label>
                                        <input
                                            type="range" min="8" max="200" step="1"
                                            value={selection.fontSize}
                                            onChange={(e) => updateSelectedProp('fontSize', Number(e.target.value))}
                                            className="w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Cor</label>
                                        <input
                                            type="color"
                                            value={selection.fill}
                                            onChange={(e) => updateSelectedProp('fill', e.target.value)}
                                            className="w-full h-9 rounded border-gray-300"
                                        />
                                    </div>
                                </>
                            )}

                            {/* Tamanho — px */}
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Largura (px)</label>
                                <input
                                    type="number" min="1"
                                    value={selection.width}
                                    onChange={(e) => updateSelectedProp('width', e.target.value)}
                                    className="w-full text-sm rounded border-gray-300"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Altura (px)</label>
                                <input
                                    type="number" min="1"
                                    value={selection.height}
                                    onChange={(e) => updateSelectedProp('height', e.target.value)}
                                    className="w-full text-sm rounded border-gray-300"
                                />
                            </div>
                            {/* Escala — % */}
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">
                                    Escala ({selection.scalePct}%)
                                </label>
                                <input
                                    type="range" min="10" max="400" step="5"
                                    value={selection.scalePct}
                                    onChange={(e) => updateSelectedProp('scalePct', e.target.value)}
                                    className="w-full"
                                />
                            </div>

                            {/* Remover fundo — só para imagens */}
                            {! selection.isText && (
                                <button
                                    onClick={removeBackgroundOfSelected}
                                    disabled={removingBg}
                                    className="w-full mt-1 px-3 py-2 text-xs font-semibold text-white bg-fuchsia-600 hover:bg-fuchsia-700 disabled:bg-fuchsia-400 rounded flex items-center justify-center gap-2"
                                    title="Remove o fundo automaticamente (IA no navegador)"
                                >
                                    {removingBg ? (
                                        <>
                                            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                                            </svg>
                                            Processando{removeBgProgress > 0 ? ` ${removeBgProgress}%` : '…'}
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                      d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.5M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                                            </svg>
                                            Remover fundo
                                        </>
                                    )}
                                </button>
                            )}

                            <button
                                onClick={deleteSelected}
                                className="w-full mt-2 px-3 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded"
                            >
                                Apagar elemento (Del)
                            </button>
                        </div>
                    )}

                    {/* AÇÕES GERAIS */}
                    <div className="border-t border-gray-300 pt-4 space-y-2">
                        <button
                            onClick={applyOfficialTemplate}
                            className="w-full px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded flex items-center justify-center gap-2"
                            title="Recria o crachá no padrão oficial (640x1006, com foto, QR e textos do funcionário)"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Aplicar template oficial
                        </button>
                        <button
                            onClick={clearCanvas}
                            className="w-full px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded"
                        >
                            Limpar canvas
                        </button>
                    </div>

                    <p className="text-[10px] text-gray-400 leading-snug">
                        Dicas: arraste para mover, alças nos cantos para redimensionar.
                        <br/>
                        <kbd className="px-1 bg-gray-200 rounded">scroll</kbd> sobre o canvas faz zoom
                        ({' '}<kbd className="px-1 bg-gray-200 rounded">Ctrl</kbd>+scroll = preciso).
                        <br/>
                        <kbd className="px-1 bg-gray-200 rounded">Del</kbd> apaga selecionado,{' '}
                        <kbd className="px-1 bg-gray-200 rounded">Esc</kbd> fecha o editor.
                    </p>
                </aside>

                {/* CANVAS CENTRAL */}
                <main ref={mainRef} className="flex-1 flex items-center justify-center overflow-auto bg-gray-700 p-6 relative">
                    {loadError ? (
                        <div className="text-center text-rose-300">
                            <p className="font-semibold mb-2">{loadError}</p>
                            <p className="text-xs text-gray-400">Após instalar, recarregue a página.</p>
                        </div>
                    ) : (
                        <div className="bg-white shadow-2xl">
                            <canvas ref={canvasElRef} />
                        </div>
                    )}

                    {/* HUD de Zoom — sobreposto no canto inferior-direito do viewport central */}
                    {fabricReady && (
                        <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-gray-900/90 backdrop-blur px-3 py-2 rounded-lg shadow-lg border border-gray-700">
                            <button
                                onClick={() => setZoom(z => Number(Math.max(0.1, z - 0.1).toFixed(2)))}
                                className="w-7 h-7 flex items-center justify-center rounded text-white hover:bg-gray-700"
                                title="Diminuir zoom"
                            >−</button>

                            <input
                                type="range"
                                min="0.1" max="2" step="0.05"
                                value={zoom}
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className="w-32 accent-indigo-500"
                                title="Zoom do canvas"
                            />

                            <button
                                onClick={() => setZoom(z => Number(Math.min(2, z + 0.1).toFixed(2)))}
                                className="w-7 h-7 flex items-center justify-center rounded text-white hover:bg-gray-700"
                                title="Aumentar zoom"
                            >+</button>

                            <span className="text-xs text-gray-300 font-mono w-12 text-right tabular-nums">
                                {Math.round(zoom * 100)}%
                            </span>

                            <button
                                onClick={fitToScreen}
                                className="px-2 py-1 text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded"
                                title="Ajustar à tela"
                            >
                                Ajustar
                            </button>
                            <button
                                onClick={() => setZoom(1)}
                                className="px-2 py-1 text-xs text-white bg-gray-700 hover:bg-gray-600 rounded"
                                title="Zoom 100% (tamanho real)"
                            >
                                100%
                            </button>
                        </div>
                    )}
                </main>
            </div>

            {/* FOOTER */}
            <div className="flex items-center justify-between gap-3 px-6 py-3 bg-gray-800 border-t border-gray-700">
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-200 bg-gray-700 hover:bg-gray-600 rounded"
                >
                    Cancelar
                </button>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleDownload}
                        disabled={! fabricReady || saving}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Baixar PNG
                    </button>
                    <button
                        onClick={handleSaveAsProfile}
                        disabled={! fabricReady || saving}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-rise-600 hover:bg-rise-700 disabled:opacity-50 rounded"
                    >
                        {saving ? 'Salvando…' : 'Salvar como foto do funcionário'}
                    </button>
                </div>
            </div>
        </div>
    );
}
