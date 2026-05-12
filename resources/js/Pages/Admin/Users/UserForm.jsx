import { useState } from 'react';
import { useForm, Link } from '@inertiajs/react';

export default function UserForm({ user, companies, groupedModules, modulePermissions = {}, isEdit = false }) {
    // Inicialização segura dos times/companies
    const initialCompanies = isEdit && user.companies
        ? user.companies.map(c => c.id.toString())
        : [];

    // Inicialização segura das permissões
    // O backend espera: permissions[module_id][view] = '1' ou true
    const deserializePermissions = () => {
        let perms = {};
        if (isEdit && modulePermissions) {
            Object.keys(modulePermissions).forEach((moduleId) => {
                const mp = modulePermissions[moduleId];
                perms[moduleId] = {
                    list: mp.can_list ? true : false,
                    view: mp.can_view ? true : false,
                    create: mp.can_create ? true : false,
                    edit: mp.can_edit ? true : false,
                    delete: mp.can_delete ? true : false,
                };
            });
        }
        return perms;
    };

    const { data, setData, post, put, processing, errors } = useForm({
        name: user?.name || '',
        email: user?.email || '',
        password: '',
        password_confirmation: '',
        type: user?.type || 'user',
        is_active: user ? user.is_active : true, // 1 ou 0 vindo do DB
        companies: initialCompanies,
        permissions: deserializePermissions(),
    });

    const [openPanels, setOpenPanels] = useState({});

    const togglePanel = (id) => {
        setOpenPanels(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleCompanyToggle = (companyId) => {
        const idStr = companyId.toString();
        let selected = [...data.companies];
        if (selected.includes(idStr)) {
            selected = selected.filter(i => i !== idStr);
        } else {
            selected.push(idStr);
        }
        setData('companies', selected);
    };

    const handlePermissionToggle = (moduleId, action) => {
        let updatedParams = { ...data.permissions };
        if (!updatedParams[moduleId]) {
            updatedParams[moduleId] = {};
        }
        updatedParams[moduleId][action] = !updatedParams[moduleId][action];
        
        setData('permissions', updatedParams);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isEdit) {
            put(route('admin.users.update', user.id));
        } else {
            post(route('admin.users.store'));
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* DADOS BÁSICOS */}
            <div className="bg-white shadow-sm border border-gray-100 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Informações Iniciais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700">Nome Completo</label>
                        <input
                            type="text"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#00b393] focus:ring-[#00b393] sm:text-sm"
                            required
                        />
                        {errors.name && <div className="text-rose-500 text-xs mt-1">{errors.name}</div>}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700">Endereço de E-mail</label>
                        <input
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#00b393] focus:ring-[#00b393] sm:text-sm"
                            required
                        />
                        {errors.email && <div className="text-rose-500 text-xs mt-1">{errors.email}</div>}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700">Senha {isEdit && <span className="text-gray-400 font-normal">(deixe em branco para manter)</span>}</label>
                        <input
                            type="password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#00b393] focus:ring-[#00b393] sm:text-sm"
                            {...(!isEdit && { required: true })}
                        />
                        {errors.password && <div className="text-rose-500 text-xs mt-1">{errors.password}</div>}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700">Confirmar Senha</label>
                        <input
                            type="password"
                            value={data.password_confirmation}
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#00b393] focus:ring-[#00b393] sm:text-sm"
                            {...(data.password && { required: true })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700">Nível de Acesso Global (Tipo)</label>
                        <select
                            value={data.type}
                            onChange={(e) => setData('type', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#00b393] focus:ring-[#00b393] sm:text-sm"
                        >
                            <option value="user">Usuário Padrão</option>
                            <option value="admin">Administrador Sistêmico</option>
                            <option value="super_admin">Super Admin (God Mode)</option>
                        </select>
                        {errors.type && <div className="text-rose-500 text-xs mt-1">{errors.type}</div>}
                    </div>

                    <div className="flex items-center pt-6">
                        <label className="flex items-center cursor-pointer gap-2">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={data.is_active}
                                    onChange={(e) => setData('is_active', e.target.checked)}
                                />
                                <div className={`block w-10 h-6 rounded-full transition-colors ${data.is_active ? 'bg-[#00b393]' : 'bg-gray-300'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${data.is_active ? 'transform translate-x-4' : ''}`}></div>
                            </div>
                            <span className="text-sm font-semibold text-gray-700">Conta Ativa (Liberar acesso)</span>
                        </label>
                        {errors.is_active && <div className="text-rose-500 text-xs mt-1 ml-4">{errors.is_active}</div>}
                    </div>
                </div>
            </div>

            {/* EMPRESAS */}
            <div className="bg-white shadow-sm border border-gray-100 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Isolamento Multi-Tenant (Empresas)</h3>
                <p className="text-sm text-gray-500 mb-4">Escolha em quais do paineis corporativos este usuário tem autorização para transitar e consultar dados.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {companies && companies.map((company) => {
                        const isChecked = data.companies.includes(company.id.toString());
                        return (
                            <label key={company.id} className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${isChecked ? 'bg-[#f0f9f8] border-[#00b393]' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
                                <input
                                    type="checkbox"
                                    onChange={() => handleCompanyToggle(company.id)}
                                    checked={isChecked}
                                    className="mt-0.5 rounded border-gray-300 text-[#00b393] focus:ring-[#00b393]"
                                />
                                <span className="ml-2 text-sm font-medium text-gray-800">{company.name}</span>
                            </label>
                        );
                    })}
                </div>
                {errors.companies && <div className="text-rose-500 text-xs mt-2">{errors.companies}</div>}
            </div>

            {/* PERMISSÕES DE MÓDULOS */}
            <div className="bg-white shadow-sm border border-gray-100 rounded-xl p-6">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="text-lg font-bold text-gray-900">Configuração de Permissões</h3>
                    <span className="bg-orange-100 text-orange-800 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">
                        Grupos de Módulos
                    </span>
                </div>

                {(!groupedModules || Object.keys(groupedModules).length === 0) ? (
                    <p className="text-sm text-gray-500 text-center py-6">Nenhum módulo ativo cadastrado no sistema base.</p>
                ) : (
                    <div className="space-y-3">
                        {Object.entries(groupedModules).map(([baseModuleId, group]) => {
                            // Find the main module header name
                            const baseModule = group.find(m => m.id.toString() === baseModuleId) || group[0];
                            const isOpen = openPanels[baseModuleId] || false;
                            const moduleLabel = baseModule ? baseModule.name : `Módulo #${baseModuleId}`;
                            const routesList = group.map(m => m.route_name).filter(Boolean).join(', ');

                            return (
                                <div key={baseModuleId} className={`border rounded-lg overflow-hidden transition-colors ${isOpen ? 'border-[#00b393]' : 'border-gray-200'}`}>
                                    <button
                                        type="button"
                                        onClick={() => togglePanel(baseModuleId)}
                                        className={`w-full flex items-center justify-between px-4 py-3 text-left font-semibold focus:outline-none transition-colors ${isOpen ? 'bg-[#f0f9f8] text-[#008f75]' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
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
                                                    {group.map((module) => {
                                                        const mId = module.id;
                                                        const p = data.permissions[mId] || {};
                                                        return (
                                                            <tr key={mId} className="hover:bg-gray-50/50">
                                                                <td className="px-2 py-3 font-medium text-gray-800">
                                                                    {module.name}
                                                                    {module.route_name && <div className="text-[10px] text-gray-400 font-normal">{module.route_name}</div>}
                                                                </td>
                                                                <td className="px-2 py-3 text-center">
                                                                    <input type="checkbox" checked={!!p.view} onChange={() => handlePermissionToggle(mId, 'view')} className="rounded border-gray-300 text-[#00b393] focus:ring-[#00b393] w-4 h-4 cursor-pointer" />
                                                                </td>
                                                                <td className="px-2 py-3 text-center">
                                                                    <input type="checkbox" checked={!!p.list} onChange={() => handlePermissionToggle(mId, 'list')} className="rounded border-gray-300 text-[#00b393] focus:ring-[#00b393] w-4 h-4 cursor-pointer" />
                                                                </td>
                                                                <td className="px-2 py-3 text-center">
                                                                    <input type="checkbox" checked={!!p.create} onChange={() => handlePermissionToggle(mId, 'create')} className="rounded border-gray-300 text-[#00b393] focus:ring-[#00b393] w-4 h-4 cursor-pointer" />
                                                                </td>
                                                                <td className="px-2 py-3 text-center">
                                                                    <input type="checkbox" checked={!!p.edit} onChange={() => handlePermissionToggle(mId, 'edit')} className="rounded border-gray-300 text-[#00b393] focus:ring-[#00b393] w-4 h-4 cursor-pointer" />
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
                    href={route('admin.users.index')}
                    className="px-6 py-2.5 rounded-lg font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none transition-colors"
                >
                    Cancelar
                </Link>
                <button
                    type="submit"
                    disabled={processing}
                    className={`px-8 py-2.5 rounded-lg font-bold text-white shadow-md transition-all ${processing ? 'bg-gray-400 cursor-not-allowed hidden' : 'bg-[#00b393] hover:bg-[#008f75] hover:-translate-y-0.5 hover:shadow-lg'}`}
                >
                    {isEdit ? 'Salvar Alterações' : 'Criar Nova Conta'}
                </button>
            </div>
        </form>
    );
}
