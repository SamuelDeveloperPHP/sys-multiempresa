// resources/js/Pages/Admin/Estoque/_shared/Pickers.jsx
// -----------------------------------------------------------------------------
// Componentes compartilhados entre as telas dedicadas de estoque (entradas,
// saídas, devoluções, transferências, retirada rápida).
// -----------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

/* ----------------------------- helpers EPI ------------------------------- */
export const TIPOS_COM_LOTE = ['epi', 'calcado_seguranca', 'epc', 'uniforme'];

const normalize = (s) =>
    (s ?? '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function detectarTipoPorTexto(texto) {
    const n = normalize(texto);
    if (/\bcalcad|botina|sapato|\bbota/.test(n))                                                          return 'calcado_seguranca';
    if (/uniforme|vestuario|camisa|\bcalca|jaleco|macacao|camiseta/.test(n))                              return 'uniforme';
    if (/\bepc\b|protecao coletiva|coletiv/.test(n))                                                       return 'epc';
    if (/\bepi\b|protecao individual|oculos|capacete|\bluva|protetor|mascara|respirador|abafador/.test(n)) return 'epi';
    return null;
}

/** Infere o tipo de item do produto: campo tipo_item → categoria → nome. */
export function inferirTipoItem(produtoSel) {
    if (!produtoSel) return 'material';
    if (produtoSel.tipo_item && produtoSel.tipo_item !== 'material') return produtoSel.tipo_item;
    return detectarTipoPorTexto(produtoSel.categoria?.nome ?? '')
        ?? detectarTipoPorTexto(produtoSel.nome ?? '')
        ?? 'material';
}

export function produtoControlaLote(produtoSel) {
    if (!produtoSel) return false;
    if (produtoSel.controla_variacao) return true;
    return TIPOS_COM_LOTE.includes(inferirTipoItem(produtoSel));
}

/* ----------------------------- Field ------------------------------------- */
export function Field({ label, hint, error, children }) {
    return (
        <div>
            {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
            {children}
            {hint && !error && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
    );
}

/* ----------------------------- ProdutoPicker ----------------------------- */
export function ProdutoPicker({ value, onChange, selecionado, placeholder }) {
    const [q, setQ] = useState('');
    const [resultados, setResultados] = useState([]);
    const [aberto, setAberto] = useState(false);
    const [loading, setLoading] = useState(false);
    const wrapRef = useRef(null);

    useEffect(() => {
        if (!q || q.length < 2) { setResultados([]); return; }
        setLoading(true);
        const t = setTimeout(() => {
            axios.get(route('admin.estoque.movimentacoes.buscar-produtos'), { params: { q } })
                .then((r) => { setResultados(r.data.data || []); setAberto(true); })
                .finally(() => setLoading(false));
        }, 250);
        return () => clearTimeout(t);
    }, [q]);

    useEffect(() => {
        const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setAberto(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const escolher = (p) => { onChange(p); setQ(''); setAberto(false); };
    const limpar   = () => { onChange(null); setQ(''); };

    if (selecionado && value) {
        return (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded border">
                {selecionado.imagem ? (
                    <img src={`/storage/${selecionado.imagem}`} alt="" className="w-12 h-12 rounded object-cover border" />
                ) : (
                    <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center text-gray-400">
                        <i className="fa-solid fa-box" />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{selecionado.nome}</p>
                    <p className="text-xs text-gray-500 font-mono">{selecionado.sku} · {selecionado.unidade}</p>
                </div>
                <button type="button" onClick={limpar} className="text-gray-400 hover:text-red-600 px-2" title="Trocar">
                    <i className="fa-solid fa-xmark" />
                </button>
            </div>
        );
    }

    return (
        <div ref={wrapRef} className="relative">
            <input
                type="text" value={q} onChange={(e) => setQ(e.target.value)}
                placeholder={placeholder ?? 'Digite nome, SKU ou código de barras (mín. 2 caracteres)…'}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            />
            {loading && (
                <div className="absolute right-3 top-2.5 text-gray-400">
                    <i className="fa-solid fa-spinner fa-spin" />
                </div>
            )}
            {aberto && resultados.length > 0 && (
                <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-80 overflow-y-auto">
                    {resultados.map((p) => (
                        <li key={p.id} onClick={() => escolher(p)}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 cursor-pointer">
                            {p.imagem ? (
                                <img src={`/storage/${p.imagem}`} alt="" className="w-8 h-8 rounded object-cover border" />
                            ) : (
                                <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                                    <i className="fa-solid fa-box" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900 truncate">{p.nome}</p>
                                <p className="text-[11px] text-gray-500 font-mono">{p.sku} · {p.unidade}</p>
                            </div>
                            <span className="text-xs text-gray-500">
                                {Number(p.valor_unitario || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
            {aberto && q.length >= 2 && resultados.length === 0 && !loading && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg px-3 py-3 text-sm text-gray-500">
                    Nenhum produto encontrado.
                </div>
            )}
        </div>
    );
}

/* ----------------------------- FuncionarioRetiradaPicker ----------------- */
// Busca em `funcionarios` (sem login). Mostra badge SENHA ✓ / SEM SENHA.
export function FuncionarioRetiradaPicker({ selecionado, onChange, placeholder, obraId = null }) {
    const [q, setQ] = useState('');
    const [resultados, setResultados] = useState([]);
    const [aberto, setAberto] = useState(false);
    const [loading, setLoading] = useState(false);
    const wrapRef = useRef(null);

    useEffect(() => {
        // Com obra → lista a obra mesmo sem digitar; sem obra → exige 2+ chars.
        if ((!q || q.length < 2) && !obraId) { setResultados([]); return; }
        setLoading(true);
        const t = setTimeout(() => {
            axios.get(route('admin.estoque.movimentacoes.buscar-funcionarios-retirada'),
                { params: { q, obra_id: obraId || undefined } })
                .then((r) => { setResultados(r.data.data || []); })
                .finally(() => setLoading(false));
        }, 250);
        return () => clearTimeout(t);
    }, [q, obraId]);

    useEffect(() => {
        const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setAberto(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const escolher = (f) => { onChange(f); setQ(''); setAberto(false); };
    const limpar   = () => { onChange(null); setQ(''); };

    if (selecionado) {
        return (
            <div className="flex items-center gap-2 p-2 bg-white rounded border border-gray-300">
                <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                    {selecionado.nome?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{selecionado.nome}</p>
                    <p className="text-[11px] text-gray-500 truncate">
                        {selecionado.matricula ? `Matr. ${selecionado.matricula}` : 'sem matrícula'}
                        {selecionado.cpf && <span className="ml-2">CPF {selecionado.cpf}</span>}
                    </p>
                </div>
                {selecionado.tem_senha === false && (
                    <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded font-bold">SEM SENHA</span>
                )}
                <button type="button" onClick={limpar} className="text-gray-400 hover:text-red-600 px-1" title="Trocar">
                    <i className="fa-solid fa-xmark" />
                </button>
            </div>
        );
    }

    return (
        <div ref={wrapRef} className="relative">
            <input
                type="text" value={q} onChange={(e) => setQ(e.target.value)}
                onFocus={() => setAberto(true)}
                placeholder={placeholder ?? (obraId ? 'Funcionários da obra — clique ou busque…' : 'Buscar por nome, matrícula ou CPF…')}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            />
            {loading && <i className="fa-solid fa-spinner fa-spin absolute right-3 top-3 text-gray-400" />}
            {aberto && resultados.length > 0 && (
                <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-72 overflow-y-auto">
                    {resultados.map((f) => (
                        <li key={f.id} onClick={() => escolher(f)}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-amber-50 cursor-pointer">
                            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                                {f.nome?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900 truncate font-medium">{f.nome}</p>
                                <p className="text-[11px] text-gray-500 truncate">
                                    {f.matricula ? `Matr. ${f.matricula}` : 'sem matrícula'}
                                    {f.cpf && <span className="ml-2">· {f.cpf}</span>}
                                </p>
                            </div>
                            {f.tem_senha
                                ? <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold">SENHA ✓</span>
                                : <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded font-bold">SEM SENHA</span>}
                        </li>
                    ))}
                </ul>
            )}
            {aberto && (q.length >= 2 || obraId) && resultados.length === 0 && !loading && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg px-3 py-3 text-sm text-gray-500">
                    {obraId ? 'Nenhum funcionário ativo nesta obra.' : 'Nenhum funcionário encontrado.'}
                </div>
            )}
        </div>
    );
}

/* ----------------------------- UsuarioRetiradaPicker --------------------- */
// Autocomplete de USUÁRIOS DO SISTEMA (com login). Busca em users via
// movimentacoes.buscar-funcionarios (que retorna {id,name,email,type}).
export function UsuarioRetiradaPicker({ selecionado, onChange, placeholder }) {
    const [q, setQ] = useState('');
    const [resultados, setResultados] = useState([]);
    const [aberto, setAberto] = useState(false);
    const [loading, setLoading] = useState(false);
    const wrapRef = useRef(null);

    useEffect(() => {
        if (!q || q.length < 2) { setResultados([]); return; }
        setLoading(true);
        const t = setTimeout(() => {
            axios.get(route('admin.estoque.movimentacoes.buscar-funcionarios'), { params: { q } })
                .then((r) => { setResultados(r.data.data || []); setAberto(true); })
                .finally(() => setLoading(false));
        }, 250);
        return () => clearTimeout(t);
    }, [q]);

    useEffect(() => {
        const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setAberto(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const escolher = (u) => { onChange(u); setQ(''); setAberto(false); };
    const limpar   = () => { onChange(null); setQ(''); };

    if (selecionado) {
        return (
            <div className="flex items-center gap-2 p-2 bg-white rounded border border-gray-300">
                <div className="w-9 h-9 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">
                    {selecionado.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{selecionado.name}</p>
                    <p className="text-[11px] text-gray-500 truncate">{selecionado.email}</p>
                </div>
                <button type="button" onClick={limpar} className="text-gray-400 hover:text-red-600 px-1" title="Trocar">
                    <i className="fa-solid fa-xmark" />
                </button>
            </div>
        );
    }

    return (
        <div ref={wrapRef} className="relative">
            <input
                type="text" value={q} onChange={(e) => setQ(e.target.value)}
                placeholder={placeholder ?? 'Buscar usuário por nome ou e-mail…'}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            />
            {loading && <i className="fa-solid fa-spinner fa-spin absolute right-3 top-3 text-gray-400" />}
            {aberto && resultados.length > 0 && (
                <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-72 overflow-y-auto">
                    {resultados.map((u) => (
                        <li key={u.id} onClick={() => escolher(u)}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-sky-50 cursor-pointer">
                            <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">
                                {u.name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900 truncate font-medium">{u.name}</p>
                                <p className="text-[11px] text-gray-500 truncate">{u.email}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            {aberto && q.length >= 2 && resultados.length === 0 && !loading && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg px-3 py-3 text-sm text-gray-500">
                    Nenhum usuário encontrado.
                </div>
            )}
        </div>
    );
}

/* ----------------------------- SenhaRetiradaModal ------------------------ */
// Cadastra/altera a senha_retirada de um FUNCIONÁRIO sem sair da tela atual.
// Reusa o backend PUT admin.funcionarios.senha-retirada.update.
//   - modo 'cadastrar': só pede senha.
//   - modo 'alterar'  : pede senha nova + CPF (confirmação de identidade).
export function SenhaRetiradaModal({ funcionario, modo = 'cadastrar', onClose, onSuccess }) {
    const isUpdate = modo === 'alterar';
    const [senha, setSenha] = useState('');
    const [cpf, setCpf] = useState('');
    const [erros, setErros] = useState({});
    const [loading, setLoading] = useState(false);

    const submit = async (e) => {
        e?.preventDefault?.();
        setErros({});
        setLoading(true);
        try {
            await axios.put(
                route('admin.funcionarios.senha-retirada.update', funcionario.id),
                isUpdate ? { senha, cpf } : { senha }
            );
            onSuccess?.();
        } catch (err) {
            if (err.response?.status === 422) setErros(err.response.data?.errors ?? {});
            else setErros({ _erro: err.response?.data?.message ?? 'Erro ao salvar a senha.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <header className="px-5 py-4 border-b flex items-center justify-between">
                    <h3 className="font-bold text-gray-800">
                        {isUpdate ? 'Alterar senha de estoque' : 'Cadastrar senha de estoque'}
                    </h3>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
                </header>
                <form onSubmit={submit} className="p-5 space-y-3">
                    <div className="bg-gray-50 border rounded p-3 text-sm">
                        <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Funcionário</div>
                        <div className="font-bold text-gray-800">{funcionario.nome}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                            CPF: {funcionario.cpf || '—'} · Matrícula: {funcionario.matricula || '—'}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs uppercase font-semibold text-gray-600 block mb-1">
                            {isUpdate ? 'Nova senha *' : 'Senha *'}
                        </label>
                        <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
                               required minLength={4} maxLength={32} autoComplete="new-password"
                               placeholder="4 a 32 caracteres"
                               className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
                        {erros.senha && <p className="text-xs text-rose-600 mt-1">{erros.senha[0] ?? erros.senha}</p>}
                    </div>

                    {isUpdate && (
                        <div>
                            <label className="text-xs uppercase font-semibold text-gray-600 block mb-1">
                                CPF do funcionário *
                                <span className="font-normal lowercase text-gray-500 ml-1">(confirmação)</span>
                            </label>
                            <input type="text" value={cpf} onChange={(e) => setCpf(e.target.value)}
                                   required placeholder="000.000.000-00"
                                   className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
                            {erros.cpf && <p className="text-xs text-rose-600 mt-1">{erros.cpf[0] ?? erros.cpf}</p>}
                        </div>
                    )}

                    {erros._erro && (
                        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded p-2">{erros._erro}</p>
                    )}

                    <footer className="flex justify-end gap-2 pt-3 border-t mt-4">
                        <button type="button" onClick={onClose}
                                className="px-4 py-2 border rounded hover:bg-gray-50 text-sm">Cancelar</button>
                        <button type="submit" disabled={loading}
                                className="px-4 py-2 text-white rounded text-sm font-bold disabled:opacity-50 bg-amber-500 hover:bg-amber-600">
                            {loading ? 'Salvando…' : (isUpdate ? 'Atualizar senha' : 'Salvar senha')}
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
}

/* ----------------------------- SaldoBadge -------------------------------- */
// Mostra o saldo atual (consulta /movimentacoes/saldo) sempre que produto_id
// e obra_id estão preenchidos. Usado nas telas de saída e transferência.
export function SaldoBadge({ produto_id, obra_id, label = 'Saldo atual na obra:' }) {
    const [saldo, setSaldo] = useState(null);

    useEffect(() => {
        if (!produto_id || !obra_id) { setSaldo(null); return; }
        let active = true;
        axios.get(route('admin.estoque.movimentacoes.saldo'), { params: { produto_id, obra_id } })
            .then((r) => { if (active) setSaldo(r.data); })
            .catch(() => { if (active) setSaldo(null); });
        return () => { active = false; };
    }, [produto_id, obra_id]);

    if (saldo === null) return null;

    return (
        <div className={`px-3 py-2 rounded text-xs ${
            saldo.quantidade > 0 ? 'bg-blue-50 text-blue-800' : 'bg-amber-50 text-amber-800'
        }`}>
            <i className="fa-solid fa-circle-info mr-1" />
            {label}{' '}
            <strong>{Number(saldo.quantidade).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}</strong>
            {' '}({Number(saldo.valor_medio || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} PMP)
        </div>
    );
}

/* ----------------------------- LoteSelector ------------------------------ */
// Lista os lotes disponíveis (FEFO) de um EPI numa obra (opcionalmente filtrado
// por cor/tamanho) e deixa o usuário escolher de qual lote sai o item.
// Destaca o lote que vence primeiro (FEFO sugere o topo da lista).
export function LoteSelector({ produto_id, obra_id, cor, tamanho, value, onChange }) {
    const [lotes, setLotes] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!produto_id || !obra_id) { setLotes([]); onChange?.(null, null); return; }
        let active = true;
        setLoading(true);
        axios.get(route('admin.estoque.movimentacoes.lotes'), {
            params: { produto_id, obra_id, cor: cor || '', tamanho: tamanho || '' },
        })
            .then((r) => {
                if (!active) return;
                const data = r.data.data || [];
                setLotes(data);
                // Auto-seleciona o primeiro (FEFO) se nada escolhido ou seleção sumiu
                if (data.length && !data.some((l) => l.id === value)) onChange?.(data[0].id, data[0]);
                if (!data.length) onChange?.(null, null);
            })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [produto_id, obra_id, cor, tamanho]);

    const fmtData = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
    const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const badgeValidade = (dias) => {
        if (dias === null || dias === undefined)
            return <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">sem validade</span>;
        if (dias < 0)
            return <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold">VENCIDO</span>;
        if (dias <= 30)
            return <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">vence em {dias}d</span>;
        return <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">{dias}d</span>;
    };

    if (loading) {
        return (
            <div className="text-sm text-gray-500 py-3 text-center">
                <i className="fa-solid fa-spinner fa-spin mr-2" /> Carregando lotes…
            </div>
        );
    }

    if (!produto_id || !obra_id) {
        return <p className="text-xs text-gray-400">Selecione produto e obra para ver os lotes.</p>;
    }

    if (lotes.length === 0) {
        return (
            <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
                <i className="fa-solid fa-triangle-exclamation mr-1" />
                Nenhum lote com saldo disponível para esta combinação. Lance a entrada primeiro.
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <p className="text-[11px] text-gray-500">
                <i className="fa-solid fa-arrow-down-short-wide mr-1" />
                Ordenado por validade (FEFO) — o primeiro vence antes.
            </p>
            {lotes.map((l, idx) => {
                const sel = value === l.id;
                return (
                    <label key={l.id}
                           className={`flex items-center gap-3 p-2.5 rounded border cursor-pointer transition-colors ${
                               sel ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:bg-gray-50'
                           }`}>
                        <input type="radio" name="lote_id" checked={sel}
                               onChange={() => onChange?.(l.id, l)}
                               className="text-red-600 focus:ring-red-500" />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-gray-900">
                                    {l.numero_lote ? `Lote ${l.numero_lote}` : `Lote #${l.id}`}
                                </span>
                                {l.variante_rotulo && (
                                    <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                                        {l.variante_rotulo}
                                    </span>
                                )}
                                {l.numero_ca && (
                                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono">
                                        CA {l.numero_ca}
                                    </span>
                                )}
                                {idx === 0 && (
                                    <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded font-bold">
                                        FEFO
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-[11px] text-gray-500">
                                <span>Validade: {fmtData(l.validade)}</span>
                                {badgeValidade(l.dias_para_vencer)}
                                <span>· {moeda(l.valor_unitario)}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-400">disponível</p>
                            <p className="text-sm font-bold text-gray-900">
                                {Number(l.quantidade_atual).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                            </p>
                        </div>
                    </label>
                );
            })}
        </div>
    );
}
