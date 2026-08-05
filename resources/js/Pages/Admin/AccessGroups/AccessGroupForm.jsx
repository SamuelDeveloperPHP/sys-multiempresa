import { useState } from 'react';
import { useForm, Link } from '@inertiajs/react';

/**
 * Formulário compartilhado de Grupo de Acesso (Nível de Acesso).
 *
 * Reaproveita o MESMO padrão de matriz de permissões do UserForm (acordeão por
 * módulo base + tabela de 5 habilidades), mas aqui as permissões pertencem ao
 * GRUPO (access_group_permissions), não ao usuário. O backend
 * (AccessGroupController::syncGroupPermissionsFromRequest) lê exatamente
 * permissions[module_id][list|view|create|edit|delete].
 *
 * Traz também o ISOLAMENTO POR OBRA do grupo (todas_obras + obra_ids), que o
 * backend sincroniza na pivot access_group_obra.
 */

/** Minúsculas e sem acento — a busca precisa achar "São José" digitando "sao jose". */
const normalizarTexto = (texto) =>
    String(texto ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

/**
 * Multiselect de obras com busca. A empresa 1 tem 42 canteiros — uma lista
 * chapada de checkboxes seria inutilizável, por isso busca + ações em massa
 * sobre o resultado filtrado + contador do total selecionado.
 */
function ObrasSelector({ obras = [], selecionadas = [], onChange }) {
    const [busca, setBusca] = useState('');
    const [somenteSelecionadas, setSomenteSelecionadas] = useState(false);

    const termo = normalizarTexto(busca);

    const filtradas = obras.filter((obra) => {
        if (somenteSelecionadas && !selecionadas.includes(obra.id)) return false;
        if (!termo) return true;
        return normalizarTexto(`${obra.codigo_obra ?? ''} ${obra.nome_fantasia ?? ''}`).includes(termo);
    });

    const idsFiltrados = filtradas.map((obra) => obra.id);
    const todosFiltradosMarcados =
        idsFiltrados.length > 0 && idsFiltrados.every((id) => selecionadas.includes(id));

    const toggleObra = (id) =>
        onChange(
            selecionadas.includes(id)
                ? selecionadas.filter((i) => i !== id)
                : [...selecionadas, id]
        );

    const alternarFiltrados = () =>
        onChange(
            todosFiltradosMarcados
                ? selecionadas.filter((id) => !idsFiltrados.includes(id))
                : Array.from(new Set([...selecionadas, ...idsFiltrados]))
        );

    if (obras.length === 0) {
        return (
            <p className="text-xs text-gray-400 text-center py-6 border border-dashed border-gray-200 rounded-lg">
                Nenhuma obra cadastrada para esta empresa.
            </p>
        );
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="relative flex-1">
                    <svg className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
                    </svg>
                    <input
                        type="text"
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        placeholder="Buscar por código ou nome da obra..."
                        className="block w-full pl-8 rounded-md border-gray-300 shadow-sm focus:border-[#557bbb] focus:ring-[#557bbb] text-xs py-1.5"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={alternarFiltrados}
                        disabled={filtradas.length === 0}
                        className={`px-3 py-1.5 rounded-md text-[11px] font-semibold border transition-colors ${filtradas.length === 0 ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-[#557bbb] text-[#3a5a8c] hover:bg-[#eef2f9]'}`}
                    >
                        {todosFiltradosMarcados ? 'Desmarcar filtradas' : 'Marcar filtradas'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setSomenteSelecionadas((v) => !v)}
                        className={`px-3 py-1.5 rounded-md text-[11px] font-semibold border transition-colors ${somenteSelecionadas ? 'bg-[#557bbb] border-[#557bbb] text-white' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                    >
                        Só selecionadas
                    </button>
                </div>
            </div>

            <div className="flex items-center justify-between mt-2 mb-2">
                <span className="text-[11px] text-gray-500">
                    <strong className="text-[#3a5a8c]">{selecionadas.length}</strong> de {obras.length} selecionadas
                    {termo ? ` · ${filtradas.length} no filtro` : ''}
                </span>
                {selecionadas.length > 0 && (
                    <button type="button" onClick={() => onChange([])} className="text-[11px] text-rose-500 hover:underline">
                        Limpar seleção
                    </button>
                )}
            </div>

            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-72 overflow-y-auto">
                {filtradas.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">Nenhuma obra encontrada para este filtro.</p>
                ) : (
                    filtradas.map((obra) => {
                        const marcada = selecionadas.includes(obra.id);
                        return (
                            <label
                                key={obra.id}
                                className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${marcada ? 'bg-[#eef2f9]' : 'hover:bg-gray-50'}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={marcada}
                                    onChange={() => toggleObra(obra.id)}
                                    className="rounded border-gray-300 text-[#557bbb] focus:ring-[#557bbb] w-4 h-4 cursor-pointer shrink-0"
                                />
                                {obra.codigo_obra && (
                                    <span className="text-[10px] font-bold text-[#3a5a8c] bg-[#eef2f9] rounded px-1.5 py-0.5 shrink-0">
                                        {obra.codigo_obra}
                                    </span>
                                )}
                                <span className="text-xs text-gray-800 truncate">{obra.nome_fantasia}</span>
                            </label>
                        );
                    })
                )}
            </div>
        </div>
    );
}

/**
 * Props:
 *  - group          {id,name,descricao,todas_obras} | null  (edição)
 *  - company        {id,name}                        (empresa corrente — contexto)
 *  - groupedModules { baseModuleId => [modules] }
 *  - permissions    { module_id => {can_list,...} }   (linhas atuais do grupo)
 *  - obras          [ {id,nome_fantasia,codigo_obra}, ... ]  (obras da empresa)
 *  - groupObraIds   [int, ...]                        (obras já vinculadas ao grupo)
 *  - isEdit         bool
 */
export default function AccessGroupForm({ group = null, company, groupedModules, permissions = {}, obras = [], groupObraIds = [], isEdit = false }) {
    // module_id => {list,view,create,edit,delete} (booleans) a partir das linhas do grupo.
    const deserializePermissions = () => {
        const perms = {};
        if (isEdit && permissions) {
            Object.keys(permissions).forEach((moduleId) => {
                const mp = permissions[moduleId];
                perms[moduleId] = {
                    list: !!mp.can_list,
                    view: !!mp.can_view,
                    create: !!mp.can_create,
                    edit: !!mp.can_edit,
                    delete: !!mp.can_delete,
                };
            });
        }
        return perms;
    };

    const { data, setData, post, put, processing, errors } = useForm({
        name: group?.name || '',
        descricao: group?.descricao || '',
        permissions: deserializePermissions(),
        // Isolamento por obra. Grupo novo nasce RESTRITO (nenhuma obra) — é o
        // padrão seguro: liberar tudo tem de ser um ato explícito do admin.
        todas_obras: !!group?.todas_obras,
        obra_ids: Array.isArray(groupObraIds) ? groupObraIds.map(Number) : [],
    });

    const [openPanels, setOpenPanels] = useState({});
    const togglePanel = (id) => setOpenPanels((prev) => ({ ...prev, [id]: !prev[id] }));

    const handlePermissionToggle = (moduleId, action) => {
        const updated = { ...data.permissions };
        if (!updated[moduleId]) updated[moduleId] = {};
        updated[moduleId] = { ...updated[moduleId], [action]: !updated[moduleId][action] };
        setData('permissions', updated);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isEdit) {
            put(route('admin.users.permissions.update', group.id));
        } else {
            post(route('admin.users.permissions.store'));
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* DADOS DO GRUPO */}
            <div className="bg-white shadow-sm border border-gray-100 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4 border-b pb-2">
                    <h3 className="text-lg font-bold text-gray-900">Identificação do Grupo</h3>
                    {company?.name && (
                        <span className="bg-[#eef2f9] text-[#3a5a8c] text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">
                            Empresa: {company.name}
                        </span>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700">Nome do Grupo</label>
                        <input
                            type="text"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="Ex.: Almoxarifes, TST, Qualidade, RH..."
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#557bbb] focus:ring-[#557bbb] sm:text-sm"
                            required
                        />
                        {errors.name && <div className="text-rose-500 text-xs mt-1">{errors.name}</div>}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700">Descrição <span className="text-gray-400 font-normal">(opcional)</span></label>
                        <input
                            type="text"
                            value={data.descricao}
                            onChange={(e) => setData('descricao', e.target.value)}
                            placeholder="Para que serve este grupo"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#557bbb] focus:ring-[#557bbb] sm:text-sm"
                        />
                        {errors.descricao && <div className="text-rose-500 text-xs mt-1">{errors.descricao}</div>}
                    </div>
                </div>
                <p className="text-[11px] text-gray-500 mt-4">
                    As permissões abaixo são <strong>herdadas</strong> por todos os usuários vinculados a este grupo nesta empresa.
                    No cadastro de cada usuário ainda é possível aplicar um <strong>override por módulo</strong>, que prevalece sobre o grupo.
                </p>
            </div>

            {/* OBRAS (CANTEIROS) DO GRUPO */}
            <div className="bg-white shadow-sm border border-gray-100 rounded-xl p-6">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="text-lg font-bold text-gray-900">Obras (canteiros)</h3>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">
                        União com o usuário
                    </span>
                </div>

                <p className="text-[11px] text-gray-500 mb-4 -mt-2">
                    Define <strong>quais canteiros</strong> os usuários deste grupo enxergam. O acesso final de cada usuário
                    é a <strong>união</strong> das obras do grupo com as obras marcadas no cadastro dele — ao contrário das
                    permissões de módulo, que são override.
                </p>

                <label className="flex items-center cursor-pointer gap-2 w-fit">
                    <div className="relative">
                        <input
                            type="checkbox"
                            className="sr-only"
                            checked={data.todas_obras}
                            onChange={(e) => setData('todas_obras', e.target.checked)}
                        />
                        <div className={`block w-10 h-6 rounded-full transition-colors ${data.todas_obras ? 'bg-[#557bbb]' : 'bg-gray-300'}`}></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${data.todas_obras ? 'transform translate-x-4' : ''}`}></div>
                    </div>
                    <span className="text-sm font-semibold text-gray-700">Acessa todas as obras da empresa</span>
                </label>

                {data.todas_obras ? (
                    <div className="mt-4 rounded-lg border border-[#557bbb] bg-[#eef2f9] px-4 py-3">
                        <p className="text-xs text-[#3a5a8c]">
                            Este grupo enxerga <strong>todas as {obras.length} obras</strong> da empresa
                            {company?.name ? ` ${company.name}` : ''} — inclusive as que forem cadastradas depois.
                            A lista de seleção fica desativada.
                        </p>
                        {data.obra_ids.length > 0 && (
                            <p className="text-[11px] text-[#3a5a8c] mt-1 opacity-80">
                                A seleção anterior ({data.obra_ids.length} obra{data.obra_ids.length > 1 ? 's' : ''}) continua guardada,
                                caso você desligue esta opção.
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="mt-4">
                        <ObrasSelector
                            obras={obras}
                            selecionadas={data.obra_ids}
                            onChange={(ids) => setData('obra_ids', ids)}
                        />
                    </div>
                )}

                {errors.obra_ids && <div className="text-rose-500 text-xs mt-2">{errors.obra_ids}</div>}
                {errors.todas_obras && <div className="text-rose-500 text-xs mt-2">{errors.todas_obras}</div>}
            </div>

            {/* MATRIZ DE PERMISSÕES DO GRUPO */}
            <div className="bg-white shadow-sm border border-gray-100 rounded-xl p-6">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="text-lg font-bold text-gray-900">Permissões do Grupo</h3>
                    <span className="bg-orange-100 text-orange-800 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">
                        Grupos de Módulos
                    </span>
                </div>

                {(!groupedModules || Object.keys(groupedModules).length === 0) ? (
                    <p className="text-sm text-gray-500 text-center py-6">Nenhum módulo ativo cadastrado no sistema base.</p>
                ) : (
                    <div className="space-y-3">
                        {Object.entries(groupedModules).map(([baseModuleId, groupModules]) => {
                            const baseModule = groupModules.find((m) => m.id.toString() === baseModuleId) || groupModules[0];
                            const isOpen = openPanels[baseModuleId] || false;
                            const moduleLabel = baseModule ? baseModule.name : `Módulo #${baseModuleId}`;
                            const routesList = groupModules.map((m) => m.route_name).filter(Boolean).join(', ');

                            return (
                                <div key={baseModuleId} className={`border rounded-lg overflow-hidden transition-colors ${isOpen ? 'border-[#557bbb]' : 'border-gray-200'}`}>
                                    <button
                                        type="button"
                                        onClick={() => togglePanel(baseModuleId)}
                                        className={`w-full flex items-center justify-between px-4 py-3 text-left font-semibold focus:outline-none transition-colors ${isOpen ? 'bg-[#eef2f9] text-[#3a5a8c]' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                                    >
                                        <div className="flex flex-col">
                                            <span>{moduleLabel}</span>
                                            {routesList && <span className="text-[10px] text-gray-400 font-normal mt-0.5">Rotas: {routesList}</span>}
                                        </div>
                                        <svg className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {isOpen && (
                                        <div className="px-4 py-3 bg-white border-t border-gray-100 overflow-x-auto">
                                            <table className="min-w-full text-xs">
                                                <thead>
                                                    <tr className="text-gray-500 uppercase tracking-wide">
                                                        <th className="px-2 py-2 text-left font-bold">Sub-Módulo</th>
                                                        <th className="px-2 py-2 text-center font-bold">Ver</th>
                                                        <th className="px-2 py-2 text-center font-bold">Listar</th>
                                                        <th className="px-2 py-2 text-center font-bold">Criar</th>
                                                        <th className="px-2 py-2 text-center font-bold">Editar</th>
                                                        <th className="px-2 py-2 text-center font-bold">Excluir</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {groupModules.map((module) => {
                                                        const mId = module.id;
                                                        const p = data.permissions[mId] || {};
                                                        return (
                                                            <tr key={mId} className="hover:bg-gray-50/50">
                                                                <td className="px-2 py-3 font-medium text-gray-800">
                                                                    {module.name}
                                                                    {module.route_name && <div className="text-[10px] text-gray-400 font-normal">{module.route_name}</div>}
                                                                </td>
                                                                <td className="px-2 py-3 text-center">
                                                                    <input type="checkbox" checked={!!p.view} onChange={() => handlePermissionToggle(mId, 'view')} className="rounded border-gray-300 text-[#557bbb] focus:ring-[#557bbb] w-4 h-4 cursor-pointer" />
                                                                </td>
                                                                <td className="px-2 py-3 text-center">
                                                                    <input type="checkbox" checked={!!p.list} onChange={() => handlePermissionToggle(mId, 'list')} className="rounded border-gray-300 text-[#557bbb] focus:ring-[#557bbb] w-4 h-4 cursor-pointer" />
                                                                </td>
                                                                <td className="px-2 py-3 text-center">
                                                                    <input type="checkbox" checked={!!p.create} onChange={() => handlePermissionToggle(mId, 'create')} className="rounded border-gray-300 text-[#557bbb] focus:ring-[#557bbb] w-4 h-4 cursor-pointer" />
                                                                </td>
                                                                <td className="px-2 py-3 text-center">
                                                                    <input type="checkbox" checked={!!p.edit} onChange={() => handlePermissionToggle(mId, 'edit')} className="rounded border-gray-300 text-[#557bbb] focus:ring-[#557bbb] w-4 h-4 cursor-pointer" />
                                                                </td>
                                                                <td className="px-2 py-3 text-center">
                                                                    <input type="checkbox" checked={!!p.delete} onChange={() => handlePermissionToggle(mId, 'delete')} className="rounded border-gray-300 text-rose-500 focus:ring-rose-500 w-4 h-4 cursor-pointer" />
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
                {errors.permissions && <div className="text-rose-500 text-xs mt-2">{errors.permissions}</div>}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
                <Link
                    href={route('admin.users.permissions.index')}
                    className="px-6 py-2.5 rounded-lg font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none transition-colors"
                >
                    Cancelar
                </Link>
                <button
                    type="submit"
                    disabled={processing}
                    className={`px-8 py-2.5 rounded-lg font-bold text-white shadow-md transition-all ${processing ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#557bbb] hover:bg-[#3a5a8c] hover:-translate-y-0.5 hover:shadow-lg'}`}
                >
                    {isEdit ? 'Salvar Alterações' : 'Criar Grupo'}
                </button>
            </div>
        </form>
    );
}
