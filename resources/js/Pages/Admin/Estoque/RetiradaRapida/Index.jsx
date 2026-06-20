// resources/js/Pages/Admin/Estoque/RetiradaRapida/Index.jsx
// -----------------------------------------------------------------------------
// Tela dedicada de RETIRADA RÁPIDA com leitor de código de barras / QR.
//
// Fluxo:
//   1. Operador escolhe a obra e identifica o funcionário retirante.
//   2. Liga o scanner OU digita o código (SKU / EAN) manualmente.
//   3. A cada leitura, o item é adicionado ao "carrinho" (qtd=1 default).
//      Se o produto já está no carrinho, soma 1 unidade.
//   4. O funcionário digita a senha UMA vez e confirma — N saídas são
//      criadas em transação no servidor.
//   5. Redireciona para o comprovante em lote (auto-print opcional).
// -----------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Field, FuncionarioRetiradaPicker, SenhaRetiradaModal } from '../_shared/Pickers';

const SCANNER_ID = 'retirada-rapida-scanner';

export default function RetiradaRapidaIndex({ obras }) {
    const { flash } = usePage().props;

    const [obraId, setObraId]               = useState('');
    const [retiranteSel, setRetiranteSel]   = useState(null);
    const [senhaModal, setSenhaModal]       = useState(null); // { modo } | null
    const [itens, setItens]                 = useState([]);   // [{id, sku, nome, unidade, valor_unitario, quantidade}]
    const [codigoManual, setCodigoManual]   = useState('');
    const [erroBusca, setErroBusca]         = useState('');
    const [buscando, setBuscando]           = useState(false);
    const [scannerOn, setScannerOn]         = useState(false);
    const [scannerErro, setScannerErro]     = useState('');
    const html5QrRef                        = useRef(null);
    const lastReadRef                       = useRef({ codigo: '', ts: 0 });

    const { data, setData, post, processing, errors } = useForm({
        obra_id:                  '',
        retirante_funcionario_id: '',
        retirante_senha:          '',
        observacao:               '',
        itens:                    [],
    });

    /* ============ Sincroniza form state com o carrinho ============ */
    useEffect(() => { setData('obra_id', obraId); }, [obraId]);
    useEffect(() => { setData('retirante_funcionario_id', retiranteSel?.id ?? ''); }, [retiranteSel]);
    useEffect(() => {
        setData('itens', itens.map((i) => ({
            produto_id:     i.id,
            quantidade:     i.quantidade,
            valor_unitario: i.valor_unitario ?? 0,
        })));
    }, [itens]);

    const totalGeral = useMemo(
        () => itens.reduce((s, i) => s + (Number(i.quantidade) || 0) * (Number(i.valor_unitario) || 0), 0),
        [itens]
    );

    /* ============ Resolve um código (vindo do scanner ou input) ============ */
    const resolverCodigo = async (codigo) => {
        if (!codigo || !codigo.trim()) return;
        setErroBusca('');
        setBuscando(true);
        try {
            const r = await axios.get(route('admin.estoque.retirada-rapida.produto-por-codigo'),
                { params: { codigo: codigo.trim(), obra_id: obraId || undefined } });
            if (r.data?.ok && r.data.produto) {
                adicionarItem(r.data.produto, r.data.saldo);
                setCodigoManual('');
            }
        } catch (err) {
            const msg = err.response?.data?.error ?? 'Produto não encontrado.';
            setErroBusca(msg);
        } finally {
            setBuscando(false);
        }
    };

    const adicionarItem = (produto, saldo) => {
        setItens((cur) => {
            const idx = cur.findIndex((i) => i.id === produto.id);
            if (idx >= 0) {
                // Já está no carrinho — incrementa
                const copy = [...cur];
                copy[idx] = { ...copy[idx], quantidade: Number(copy[idx].quantidade) + 1 };
                return copy;
            }
            return [...cur, {
                id:             produto.id,
                sku:            produto.sku,
                nome:           produto.nome,
                unidade:        produto.unidade,
                valor_unitario: produto.valor_ultima_entrada ?? produto.valor_unitario ?? 0,
                quantidade:     1,
                saldo_obra:     saldo?.quantidade ?? null,
            }];
        });
    };

    const atualizarQtd = (id, qtd) => {
        setItens((cur) => cur.map((i) => i.id === id ? { ...i, quantidade: qtd } : i));
    };
    const atualizarValor = (id, v) => {
        setItens((cur) => cur.map((i) => i.id === id ? { ...i, valor_unitario: v } : i));
    };
    const remover = (id) => setItens((cur) => cur.filter((i) => i.id !== id));
    const limpar  = () => setItens([]);

    /* ============ Scanner (html5-qrcode) ============ */
    useEffect(() => {
        if (!scannerOn) return;

        let qr;
        let cancelled = false;

        (async () => {
            try {
                const { Html5Qrcode } = await import('html5-qrcode');
                qr = new Html5Qrcode(SCANNER_ID, { verbose: false });
                html5QrRef.current = qr;

                await qr.start(
                    { facingMode: 'environment' },
                    {
                        fps: 10,
                        qrbox: { width: 280, height: 180 },
                        aspectRatio: 1.7777,
                    },
                    (decoded) => {
                        // Debounce: ignora repetição do mesmo código <1.5s
                        const now = Date.now();
                        if (lastReadRef.current.codigo === decoded && now - lastReadRef.current.ts < 1500) return;
                        lastReadRef.current = { codigo: decoded, ts: now };
                        // Feedback sonoro (curto beep via Web Audio API)
                        try {
                            const ctx = new (window.AudioContext || window.webkitAudioContext)();
                            const o = ctx.createOscillator(); const g = ctx.createGain();
                            o.connect(g); g.connect(ctx.destination);
                            o.frequency.value = 880; g.gain.value = 0.1;
                            o.start(); o.stop(ctx.currentTime + 0.08);
                        } catch (_) { /* ignora */ }
                        resolverCodigo(decoded);
                    },
                    () => { /* erro de frame: silencia */ }
                );
            } catch (err) {
                if (cancelled) return;
                console.error('[Scanner]', err);
                const name = err?.name || '';
                if (name === 'NotAllowedError') setScannerErro('Permissão de câmera negada.');
                else if (name === 'NotFoundError') setScannerErro('Nenhuma câmera encontrada.');
                else setScannerErro(err?.message || String(err));
                setScannerOn(false);
            }
        })();

        return () => {
            cancelled = true;
            if (qr) {
                qr.stop().then(() => qr.clear()).catch(() => {});
            }
            html5QrRef.current = null;
        };
    }, [scannerOn, obraId]); // re-bind quando obra muda (afeta saldo retornado)

    /* ============ Submit ============ */
    const podeConfirmar = obraId
                       && retiranteSel?.id
                       && retiranteSel.tem_senha !== false
                       && itens.length > 0
                       && data.retirante_senha
                       && !processing;

    const confirmar = (e) => {
        e?.preventDefault?.();
        post(route('admin.estoque.retirada-rapida.store'));
    };

    /* ============ Render ============ */
    return (
        <AuthenticatedLayout>
            <Head title="Retirada Rápida" />
            <div className="p-6 w-full max-w-6xl mx-auto">
                <header className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <span className="text-cyan-600">⚡</span> Retirada Rápida
                        </h1>
                        <p className="text-sm text-gray-500">
                            Scaneie ou digite códigos · adicione ao carrinho · funcionário valida com senha · gera comprovante.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link href={route('admin.estoque.saidas.index')}
                              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                            Ver saídas
                        </Link>
                    </div>
                </header>

                {flash?.success && (
                    <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4">{flash.success}</div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* ============ Coluna esquerda: setup + scanner ============ */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="bg-white border rounded-lg p-4 space-y-3">
                            <Field label="Obra de saída *">
                                <select value={obraId} onChange={(e) => setObraId(e.target.value)}
                                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                                    <option value="">— Selecione —</option>
                                    {obras.map((o) => <option key={o.id} value={o.id}>{o.codigo_obra} — {o.nome_fantasia}</option>)}
                                </select>
                            </Field>

                            <Field label="Funcionário retirante *"
                                   error={errors.retirante_funcionario_id}>
                                <FuncionarioRetiradaPicker
                                    selecionado={retiranteSel}
                                    onChange={setRetiranteSel}
                                />
                                {retiranteSel?.tem_senha === false && (
                                    <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded p-2 mt-2">
                                        ⚠ Funcionário sem senha de retirada.{' '}
                                        <button type="button"
                                                onClick={() => setSenhaModal({ modo: 'cadastrar' })}
                                                className="underline font-semibold hover:text-rose-900">
                                            Cadastrar agora
                                        </button>
                                    </div>
                                )}
                                {retiranteSel?.tem_senha && (
                                    <button type="button"
                                            onClick={() => setSenhaModal({ modo: 'alterar' })}
                                            className="text-[11px] text-gray-500 hover:text-gray-700 underline mt-1">
                                        Alterar senha do funcionário
                                    </button>
                                )}
                            </Field>
                        </div>

                        <div className="bg-white border rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-sm">📷 Scanner</h3>
                                <button type="button"
                                        onClick={() => { setScannerErro(''); setScannerOn((s) => !s); }}
                                        className={`text-xs px-3 py-1 rounded-full font-bold ${
                                            scannerOn
                                                ? 'bg-red-600 text-white'
                                                : 'bg-cyan-600 text-white'
                                        }`}>
                                    {scannerOn ? 'Parar' : 'Ligar câmera'}
                                </button>
                            </div>

                            {/* Viewport do scanner — só renderiza enquanto scannerOn=true */}
                            <div id={SCANNER_ID}
                                 className={`bg-black rounded overflow-hidden ${scannerOn ? 'h-48' : 'hidden'}`} />

                            {scannerErro && (
                                <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2 rounded">
                                    {scannerErro}
                                </div>
                            )}

                            <div className="text-xs text-gray-500 border-t pt-2">
                                Ou digite o código manualmente:
                            </div>
                            <form onSubmit={(e) => { e.preventDefault(); resolverCodigo(codigoManual); }}
                                  className="flex gap-2">
                                <input type="text" autoFocus
                                       value={codigoManual}
                                       onChange={(e) => setCodigoManual(e.target.value)}
                                       placeholder="SKU ou EAN…"
                                       className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm font-mono" />
                                <button type="submit" disabled={buscando}
                                        className="px-3 py-2 bg-gray-800 text-white rounded text-sm disabled:opacity-50">
                                    {buscando ? '…' : 'Buscar'}
                                </button>
                            </form>

                            {erroBusca && (
                                <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2 rounded">
                                    {erroBusca}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ============ Coluna direita: carrinho + confirmação ============ */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-white border rounded-lg overflow-hidden">
                            <div className="px-4 py-3 border-b flex items-center justify-between">
                                <h3 className="font-semibold">
                                    🛒 Carrinho
                                    <span className="text-gray-400 font-normal text-sm ml-2">
                                        {itens.length} produto(s)
                                    </span>
                                </h3>
                                {itens.length > 0 && (
                                    <button type="button" onClick={limpar}
                                            className="text-xs text-rose-700 hover:underline">
                                        Limpar tudo
                                    </button>
                                )}
                            </div>

                            {itens.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 text-sm">
                                    Scaneie ou busque produtos para começar.
                                </div>
                            ) : (
                                <table className="w-full text-xs">
                                    <thead className="bg-gray-50 text-left text-gray-700">
                                        <tr>
                                            <th className="px-3 py-2">Produto</th>
                                            <th className="px-3 py-2 text-right" style={{ width: 130 }}>Qtd</th>
                                            <th className="px-3 py-2 text-right" style={{ width: 130 }}>Unit. (R$)</th>
                                            <th className="px-3 py-2 text-right" style={{ width: 110 }}>Total</th>
                                            <th style={{ width: 40 }} />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {itens.map((i, idx) => {
                                            const erroQtd = errors?.[`itens.${idx}.quantidade`];
                                            const total = Number(i.quantidade || 0) * Number(i.valor_unitario || 0);
                                            return (
                                                <tr key={i.id} className="hover:bg-gray-50">
                                                    <td className="px-3 py-2">
                                                        <div className="font-medium">{i.nome}</div>
                                                        <div className="text-xs text-gray-500 font-mono">
                                                            {i.sku} · {i.unidade}
                                                            {i.saldo_obra !== null && (
                                                                <span className="ml-2">
                                                                    · saldo: {Number(i.saldo_obra).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {erroQtd && (
                                                            <div className="text-xs text-rose-600 mt-1">{erroQtd}</div>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        <input type="number" step="0.001" min="0.001"
                                                               value={i.quantidade}
                                                               onChange={(e) => atualizarQtd(i.id, e.target.value)}
                                                               className="w-24 border border-gray-300 rounded px-2 py-1 text-right text-sm" />
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        <input type="number" step="0.01" min="0"
                                                               value={i.valor_unitario}
                                                               onChange={(e) => atualizarValor(i.id, e.target.value)}
                                                               className="w-24 border border-gray-300 rounded px-2 py-1 text-right text-sm" />
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-semibold">
                                                        R$ {Number(total).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        <button type="button" onClick={() => remover(i.id)}
                                                                className="text-rose-600 hover:bg-rose-50 px-2 py-1 rounded">×</button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-gray-50">
                                            <td colSpan={3} className="px-3 py-2 text-right font-semibold">Total geral</td>
                                            <td className="px-3 py-2 text-right font-bold text-cyan-700">
                                                R$ {Number(totalGeral).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td />
                                        </tr>
                                    </tfoot>
                                </table>
                            )}
                        </div>

                        {/* Confirmação com senha */}
                        <form onSubmit={confirmar} className="bg-red-50 border-2 border-red-300 rounded-lg p-4 space-y-3">
                            <h3 className="font-bold text-red-800 flex items-center gap-2">
                                🛡 Confirmar com senha do funcionário
                            </h3>
                            <p className="text-xs text-red-700">
                                A senha deve ser digitada pelo próprio {retiranteSel?.nome || 'retirante'}.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Field label="Senha do funcionário *" error={errors.retirante_senha}>
                                    <input type="password" autoComplete="new-password"
                                           value={data.retirante_senha}
                                           onChange={(e) => setData('retirante_senha', e.target.value)}
                                           disabled={!retiranteSel || retiranteSel?.tem_senha === false}
                                           className="w-full border border-gray-300 rounded px-3 py-2 text-sm disabled:bg-gray-100" />
                                </Field>
                                <Field label="Observação geral (opcional)">
                                    <input type="text" maxLength={1000}
                                           value={data.observacao}
                                           onChange={(e) => setData('observacao', e.target.value)}
                                           className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                                </Field>
                            </div>

                            <button type="submit" disabled={!podeConfirmar}
                                    className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-bold disabled:opacity-50">
                                {processing ? 'Registrando…' : `Confirmar retirada (${itens.length} item${itens.length !== 1 ? 's' : ''})`}
                            </button>
                            {!podeConfirmar && !processing && (
                                <p className="text-xs text-red-700">
                                    Preencha obra, retirante (com senha), pelo menos 1 item e digite a senha.
                                </p>
                            )}
                        </form>
                    </div>
                </div>
            </div>

            {/* Modal inline de cadastro/alteração de senha do funcionário */}
            {senhaModal && retiranteSel && (
                <SenhaRetiradaModal
                    funcionario={retiranteSel}
                    modo={senhaModal.modo}
                    onClose={() => setSenhaModal(null)}
                    onSuccess={() => {
                        setRetiranteSel((f) => ({ ...f, tem_senha: true }));
                        setSenhaModal(null);
                    }}
                />
            )}
        </AuthenticatedLayout>
    );
}
