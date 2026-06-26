import { useRef, useState } from 'react';

/**
 * Importa os dados do cadastro a partir da "Ficha de Registro de Empregado"
 * (PDF digital com texto OU foto/scan via OCR). Não grava nada: lê o documento,
 * mostra os campos com a confiança da leitura e, ao confirmar, pré-preenche o
 * formulário. O usuário ainda revisa e salva manualmente.
 */
const LABELS = {
    nome: 'Nome', cpf: 'CPF', rg: 'RG', pis: 'PIS', matricula: 'Matrícula',
    nome_mae: 'Nome da mãe', genero: 'Gênero', estado_civil: 'Estado civil',
    cep: 'CEP', endereco: 'Endereço', numero: 'Número', bairro: 'Bairro',
    cidade: 'Cidade', estado: 'UF', id_funcao: 'Função', id_setor: 'Setor',
    data_adminssao: 'Admissão', data_demissao: 'Demissão', status: 'Status',
};

const ORDEM = [
    'nome', 'cpf', 'rg', 'pis', 'matricula', 'nome_mae', 'genero', 'estado_civil',
    'cep', 'endereco', 'numero', 'bairro', 'cidade', 'estado',
    'id_funcao', 'id_setor', 'data_adminssao', 'status',
];

function selo(conf) {
    if (conf >= 0.85) return { txt: 'alta', cls: 'bg-emerald-100 text-emerald-700' };
    if (conf >= 0.55) return { txt: 'média', cls: 'bg-amber-100 text-amber-700' };
    return { txt: 'baixa', cls: 'bg-rose-100 text-rose-700' };
}

export default function ImportadorDocumento({ onAplicar }) {
    const [carregando, setCarregando] = useState(false);
    const [resultado, setResultado] = useState(null);
    const [erro, setErro] = useState(null);
    const [nomeArquivo, setNomeArquivo] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const inputRef = useRef(null);

    const enviar = async (file) => {
        if (!file) return;
        setErro(null);
        setResultado(null);
        setCarregando(true);
        setNomeArquivo(file.name);

        try {
            const fd = new FormData();
            fd.append('arquivo', file);
            const { data } = await window.axios.post(
                route('admin.funcionarios.extrair-documento'),
                fd,
                { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 180000 }
            );
            setResultado(data);
        } catch (e) {
            const msg =
                (e?.code === 'ECONNABORTED'
                    ? 'A leitura demorou demais e foi interrompida. Tente um arquivo menor/mais nítido ou apenas a página da Ficha.'
                    : null) ||
                e?.response?.data?.message ||
                e?.response?.data?.errors?.arquivo?.[0] ||
                'Falha ao processar o documento. Tente outro arquivo.';
            setErro(msg);
        } finally {
            setCarregando(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    const aplicar = () => {
        if (resultado?.campos) onAplicar(resultado.campos);
    };

    const valorExibido = (chave, campo) => {
        if (chave === 'id_funcao' || chave === 'id_setor') {
            if (campo.encontrado) return campo.rotulo || '✓ vinculado';
            return campo.sugestao ? `não localizado — lido: "${campo.sugestao}"` : '—';
        }
        return campo.valor || '—';
    };

    const camposLidos = resultado?.campos
        ? ORDEM.filter((k) => resultado.campos[k] && (resultado.campos[k].encontrado || resultado.campos[k].valor))
        : [];

    return (
        <div className="bg-white shadow-sm border border-dashed border-[#557bbb]/40 rounded-xl p-6 mb-6">
            <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <svg className="w-5 h-5 text-[#557bbb]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.9A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                        </svg>
                        Preencher a partir de um documento
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Carregue a <strong>Ficha de Registro de Empregado</strong> em PDF ou foto/imagem.
                        O sistema lê os dados e preenche o formulário para você conferir antes de salvar.
                    </p>
                </div>
            </div>

            {/* Zona de upload */}
            {!carregando && (
                <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); enviar(e.dataTransfer.files?.[0]); }}
                    onClick={() => inputRef.current?.click()}
                    className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                        dragOver ? 'border-[#557bbb] bg-[#eef2f9]' : 'border-gray-200 hover:border-[#557bbb]/60 hover:bg-gray-50'
                    }`}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
                        className="hidden"
                        onChange={(e) => enviar(e.target.files?.[0])}
                    />
                    <p className="text-sm font-medium text-gray-700">
                        Arraste o arquivo aqui ou <span className="text-[#557bbb] underline">clique para selecionar</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG ou WEBP</p>
                </div>
            )}

            {/* Carregando */}
            {carregando && (
                <div className="flex items-center gap-3 rounded-lg bg-[#eef2f9] p-4 text-[#3a5a8c]">
                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                    </svg>
                    <span className="text-sm font-medium">
                        Lendo <strong>{nomeArquivo}</strong>… (documentos escaneados podem levar alguns segundos)
                    </span>
                </div>
            )}

            {/* Erro de requisição */}
            {erro && (
                <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                    {erro}
                </div>
            )}

            {/* Resultado */}
            {resultado && (
                <div className="mt-4">
                    {/* Qualidade inadequada */}
                    {!resultado.ok && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                            <p className="text-sm font-semibold text-amber-800">
                                Não foi possível ler o documento com qualidade suficiente.
                            </p>
                            <ul className="mt-2 list-disc pl-5 text-sm text-amber-700 space-y-1">
                                {(resultado.qualidade?.problemas || []).map((p, i) => <li key={i}>{p}</li>)}
                            </ul>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => { setResultado(null); setNomeArquivo(''); }}
                                    className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#557bbb] hover:bg-[#3a5a8c]"
                                >
                                    Enviar outro arquivo
                                </button>
                                {camposLidos.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={aplicar}
                                        className="px-4 py-2 rounded-lg text-sm font-semibold text-amber-800 bg-white border border-amber-300 hover:bg-amber-100"
                                    >
                                        Aplicar mesmo assim ({camposLidos.length} campos)
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Leitura OK */}
                    {resultado.ok && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <p className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Documento lido — confira os {camposLidos.length} campos abaixo.
                                </p>
                                <span className="text-xs text-emerald-700">
                                    Fonte: {resultado.fonte === 'ocr' ? 'OCR (imagem)' : 'PDF (texto)'} · qualidade {resultado.qualidade?.nivel}
                                </span>
                            </div>

                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 max-h-72 overflow-y-auto">
                                {camposLidos.map((k) => {
                                    const campo = resultado.campos[k];
                                    const b = selo(campo.confianca ?? 0);
                                    return (
                                        <div key={k} className="flex items-center justify-between gap-2 py-1 border-b border-emerald-100/70">
                                            <span className="text-xs text-gray-500 shrink-0">{LABELS[k] || k}</span>
                                            <span className="text-sm text-gray-800 text-right truncate" title={valorExibido(k, campo)}>
                                                {valorExibido(k, campo)}
                                            </span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${b.cls}`}>{b.txt}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={aplicar}
                                    className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700"
                                >
                                    Aplicar aos campos do formulário
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setResultado(null); setNomeArquivo(''); }}
                                    className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 bg-white border border-gray-300 hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                            </div>
                            <p className="mt-2 text-xs text-gray-500">
                                Campos com selo <span className="text-amber-700 font-medium">média</span>/<span className="text-rose-700 font-medium">baixa</span> merecem atenção. Revise tudo antes de salvar.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
