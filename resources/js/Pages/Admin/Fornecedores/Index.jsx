import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { safeLabel } from '@/utils/sanitize';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const ESTADOS_BR = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export default function FornecedoresIndex({ fornecedores, filtros }) {
  const { flash } = usePage().props;
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [f, setF] = useState({ q: filtros?.q ?? '', status: filtros?.status ?? '' });

  const aplicar = (e) => {
    e?.preventDefault?.();
    router.get(route('admin.fornecedores.index'), f, { preserveState: true, preserveScroll: true });
  };

  const novoCadastro = () => { setEditing(null); setShowForm(true); };

  const editar = (forn) => { setEditing(forn); setShowForm(true); };

  const excluir = (forn) => {
    if (!confirm(`Remover o fornecedor "${forn.nome_fantasia}"?`)) return;
    router.delete(route('admin.fornecedores.destroy', forn.id), { preserveScroll: true });
  };

  return (
    <AuthenticatedLayout>
      <Head title="Fornecedores" />
      <div className="p-6 w-full">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Fornecedores</h1>
            <p className="text-sm text-gray-500">Empresas e prestadores de serviço (manutenções, peças, seguros, IPVA)</p>
          </div>
          <button onClick={novoCadastro} className="bg-rise-600 text-white px-4 py-2 rounded hover:bg-rise-700">
            + Novo fornecedor
          </button>
        </header>

        {flash?.success && <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4">{flash.success}</div>}

        {showForm && (
          <FornecedorForm
            fornecedor={editing}
            onClose={() => setShowForm(false)}
          />
        )}

        <form onSubmit={aplicar} className="bg-white rounded-lg border p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-2">
          <input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })}
                 placeholder="Buscar por nome, razão social, CNPJ..."
                 className="md:col-span-2 border border-gray-300 rounded px-3 py-2" />
          <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}
                  className="border border-gray-300 rounded px-3 py-2">
            <option value="">Todos os status</option>
            <option>Ativo</option>
            <option>Inativo</option>
          </select>
          <button className="px-4 py-2 bg-gray-800 text-white rounded">Filtrar</button>
        </form>

        <div className="bg-white rounded-lg shadow border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left font-semibold text-gray-700">
              <tr>
                <th className="px-4 py-3">Nome fantasia</th>
                <th className="px-4 py-3">Razão social</th>
                <th className="px-4 py-3">CNPJ</th>
                <th className="px-4 py-3">Cidade/UF</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {fornecedores.data.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-gray-500 py-8">Nenhum fornecedor cadastrado.</td></tr>
              ) : fornecedores.data.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{f.nome_fantasia}</td>
                  <td className="px-4 py-3">{f.razao_social || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs">{f.cnpj || f.cpf || '—'}</td>
                  <td className="px-4 py-3">{[f.cidade, f.estado].filter(Boolean).join('/') || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${f.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
                      {f.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    <button onClick={() => editar(f)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition">Editar</button>
                    <button onClick={() => excluir(f)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {fornecedores.links?.length > 3 && (
          <nav className="flex justify-center gap-1 mt-4">
            {fornecedores.links.map((link, i) => (
              <Link key={i} href={link.url ?? '#'} preserveScroll
                    className={`px-3 py-1 rounded text-sm ${
                      link.active ? 'bg-rise-600 text-white'
                                  : link.url ? 'bg-white border hover:bg-gray-50' : 'opacity-30 cursor-not-allowed'
                    }`}
                    dangerouslySetInnerHTML={safeLabel(link.label)} />
            ))}
          </nav>
        )}
      </div>
    </AuthenticatedLayout>
  );
}

function FornecedorForm({ fornecedor, onClose }) {
  const editando = !!fornecedor?.id;

  const { data, setData, post, put, processing, errors, reset } = useForm({
    nome_fantasia:       fornecedor?.nome_fantasia ?? '',
    razao_social:        fornecedor?.razao_social ?? '',
    atividade_principal: fornecedor?.atividade_principal ?? '',
    cnpj:                fornecedor?.cnpj ?? '',
    cpf:                 fornecedor?.cpf ?? '',
    cep:                 fornecedor?.cep ?? '',
    endereco:            fornecedor?.endereco ?? '',
    numero:              fornecedor?.numero ?? '',
    bairro:              fornecedor?.bairro ?? '',
    cidade:              fornecedor?.cidade ?? '',
    estado:              fornecedor?.estado ?? '',
    email:               fornecedor?.email ?? '',
    celular:             fornecedor?.celular ?? '',
    status:              fornecedor?.status ?? 'Ativo',
  });

  const submit = (e) => {
    e.preventDefault();
    if (editando) {
      put(route('admin.fornecedores.update', fornecedor.id), { preserveScroll: true, onSuccess: () => { reset(); onClose(); } });
    } else {
      post(route('admin.fornecedores.store'), { preserveScroll: true, onSuccess: () => { reset(); onClose(); } });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border p-6 mb-4 border-rise-300">
      <header className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{editando ? `Editar fornecedor #${fornecedor.id}` : 'Novo fornecedor'}</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕ Fechar</button>
      </header>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <F label="Nome fantasia *" name="nome_fantasia" data={data} setData={setData} errors={errors} className="md:col-span-2" />
        <F label="Status" name="status" errors={errors}>
          <select value={data.status} onChange={(e) => setData('status', e.target.value)} className={inputCls}>
            <option>Ativo</option>
            <option>Inativo</option>
          </select>
        </F>

        <F label="Razão social" name="razao_social" data={data} setData={setData} errors={errors} className="md:col-span-2" />
        <F label="Atividade principal" name="atividade_principal" data={data} setData={setData} errors={errors} />

        <F label="CNPJ" name="cnpj" data={data} setData={setData} errors={errors} />
        <F label="CPF (se for PF)" name="cpf" data={data} setData={setData} errors={errors} />
        <F label="Email" name="email" type="email" data={data} setData={setData} errors={errors} />

        <F label="Celular" name="celular" data={data} setData={setData} errors={errors} />
        <F label="CEP" name="cep" data={data} setData={setData} errors={errors} />

        <F label="Endereço" name="endereco" data={data} setData={setData} errors={errors} className="md:col-span-2" />
        <F label="Número" name="numero" data={data} setData={setData} errors={errors} />

        <F label="Bairro" name="bairro" data={data} setData={setData} errors={errors} />
        <F label="Cidade" name="cidade" data={data} setData={setData} errors={errors} />
        <F label="Estado (UF)" name="estado" errors={errors}>
          <select value={data.estado} onChange={(e) => setData('estado', e.target.value)} className={inputCls}>
            <option value="">—</option>
            {ESTADOS_BR.map((uf) => <option key={uf}>{uf}</option>)}
          </select>
        </F>

        <div className="md:col-span-3 flex gap-2 justify-end mt-2 border-t pt-3">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-50">Cancelar</button>
          <button type="submit" disabled={processing}
                  className="px-4 py-2 bg-rise-600 text-white rounded hover:bg-rise-700 disabled:opacity-50">
            {processing ? 'Salvando...' : (editando ? 'Atualizar' : 'Cadastrar')}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputCls = 'w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-rise-500 focus:border-rise-500';

function F({ label, name, type = 'text', data, setData, errors, children, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">{label}</label>
      {children ?? (
        <input type={type} value={data?.[name] ?? ''} onChange={(e) => setData(name, e.target.value)} className={inputCls} />
      )}
      {errors?.[name] && <p className="text-red-600 text-xs mt-1">{errors[name]}</p>}
    </div>
  );
}
