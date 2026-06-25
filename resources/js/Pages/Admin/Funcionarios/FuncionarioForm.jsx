import { useState, useEffect } from 'react';
import { useForm, Link } from '@inertiajs/react';
import ImportadorDocumento from './Partials/ImportadorDocumento';

export default function FuncionarioForm({
    funcionario,
    companies,
    selectedCompanies,
    obras,
    funcoes,
    setores,
    groupedModules,
    linkedUser,
    modulePermissions,
    isEdit = false
}) {
    const initialCompanies = selectedCompanies ? selectedCompanies.map(id => id.toString()) : [];

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
        nome: funcionario?.nome || '',
        cpf: funcionario?.cpf || '',
        matricula: funcionario?.matricula || '',
        status: funcionario?.status || 'Ativo',
        id_obra: funcionario?.id_obra || '',
        id_funcao: funcionario?.id_funcao || '',
        id_setor: funcionario?.id_setor || '',
        
        // Dados Pessoais / Legado
        rg: funcionario?.rg || '',
        cep: funcionario?.cep || '',
        endereco: funcionario?.endereco || '',
        numero: funcionario?.numero || '',
        bairro: funcionario?.bairro || '',
        cidade: funcionario?.cidade || '',
        estado: funcionario?.estado || '',
        email: funcionario?.email || '',
        celular: funcionario?.celular || '',
        nome_mae: funcionario?.nome_mae || '',
        genero: funcionario?.genero || '',
        pis: funcionario?.pis || '',
        estado_civil: funcionario?.estado_civil || '',
        dependentes: funcionario?.dependentes || 0,
        data_adminssao: funcionario?.data_adminssao || '',
        data_demissao: funcionario?.data_demissao || '',
        afastado: funcionario ? !!funcionario.afastado : false,

        companies: initialCompanies,

        // Acesso ao Sistema
        create_user: !!linkedUser,
        user_email: linkedUser?.email || funcionario?.email || '',
        user_password: '',
        user_type: linkedUser?.type || 'user',
        permissions: deserializePermissions(),
    });

    const [openPanels, setOpenPanels] = useState({});

    const togglePanel = (id) => {
        setOpenPanels(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleCompanyToggle = (companyId) => {
        const idStr = companyId.toString();
        // Por padrão Funcionario pertence a UMA empresa primária, mas a interface e o request permitem Array.
        // Vamos manter como array com 1 elemento
        setData('companies', [idStr]);
    };

    const handlePermissionToggle = (moduleId, action) => {
        let updatedParams = { ...data.permissions };
        if (!updatedParams[moduleId]) updatedParams[moduleId] = {};
        updatedParams[moduleId][action] = !updatedParams[moduleId][action];
        setData('permissions', updatedParams);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isEdit) {
            put(route('admin.funcionarios.update', funcionario.id));
        } else {
            post(route('admin.funcionarios.store'));
        }
    };

    // Campos que o importador de documento pode preencher.
    const CAMPOS_IMPORTAVEIS = [
        'nome', 'cpf', 'rg', 'pis', 'matricula', 'nome_mae', 'genero', 'estado_civil',
        'cep', 'endereco', 'numero', 'bairro', 'cidade', 'estado',
        'id_funcao', 'id_setor', 'data_adminssao', 'data_demissao', 'status',
    ];

    // Aplica ao formulário os campos extraídos da Ficha de Registro.
    // FK (id_funcao/id_setor) só entram quando o documento casou com a lista.
    const aplicarExtraidos = (campos) => {
        const novos = { ...data };
        CAMPOS_IMPORTAVEIS.forEach((chave) => {
            const campo = campos?.[chave];
            if (!campo) return;
            const ehFk = chave === 'id_funcao' || chave === 'id_setor';
            if (ehFk) {
                if (campo.encontrado && campo.valor) novos[chave] = String(campo.valor);
            } else if (campo.valor !== '' && campo.valor != null) {
                novos[chave] = campo.valor;
            }
        });
        setData(novos);
    };

    return (
        <>
        <ImportadorDocumento onAplicar={aplicarExtraidos} />
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* EMPRESAS */}
            <div className="bg-white shadow-sm border border-gray-100 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Vínculo de Empresa (Tenant)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {companies && companies.map((company) => {
                        const isChecked = data.companies.includes(company.id.toString());
                        return (
                            <label key={company.id} className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${isChecked ? 'bg-[#eef2f9] border-[#557bbb]' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
                                <input
                                    type="radio"
                                    name="company"
                                    onChange={() => handleCompanyToggle(company.id)}
                                    checked={isChecked}
                                    className="mt-0.5 rounded-full border-gray-300 text-[#557bbb] focus:ring-[#557bbb]"
                                />
                                <span className="ml-2 text-sm font-medium text-gray-800">{company.name}</span>
                            </label>
                        );
                    })}
                </div>
                {errors.companies && <div className="text-rose-500 text-xs mt-2">{errors.companies}</div>}
            </div>

            {/* DADOS PROFISSIONAIS */}
            <div className="bg-white shadow-sm border border-gray-100 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Informações Profissionais</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700">Nome Completo</label>
                        <input
                            type="text"
                            value={data.nome}
                            onChange={(e) => setData('nome', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#557bbb] focus:ring-[#557bbb] sm:text-sm"
                            required
                        />
                        {errors.nome && <div className="text-rose-500 text-xs mt-1">{errors.nome}</div>}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700">Status</label>
                        <select
                            value={data.status}
                            onChange={(e) => setData('status', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#557bbb] focus:ring-[#557bbb] sm:text-sm"
                        >
                            <option value="Ativo">Ativo</option>
                            <option value="Inativo">Inativo</option>
                            <option value="Ferias">Férias</option>
                            <option value="Afastado">Afastado</option>
                        </select>
                        {errors.status && <div className="text-rose-500 text-xs mt-1">{errors.status}</div>}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700">Matrícula</label>
                        <input
                            type="text"
                            value={data.matricula}
                            onChange={(e) => setData('matricula', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#557bbb] focus:ring-[#557bbb] sm:text-sm"
                        />
                        {errors.matricula && <div className="text-rose-500 text-xs mt-1">{errors.matricula}</div>}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700">Função / Cargo</label>
                        <select
                            value={data.id_funcao}
                            onChange={(e) => setData('id_funcao', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#557bbb] focus:ring-[#557bbb] sm:text-sm"
                        >
                            <option value="">Selecione...</option>
                            {funcoes && funcoes.map(f => <option key={f.id} value={f.id}>{f.funcao}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700">Setor</label>
                        <select
                            value={data.id_setor}
                            onChange={(e) => setData('id_setor', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#557bbb] focus:ring-[#557bbb] sm:text-sm"
                        >
                            <option value="">— Sem setor —</option>
                            {setores && setores.map(s => <option key={s.id} value={s.id}>{s.nome_setor || s.nome}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700">
                            Obra Vinculada <span className="text-gray-400 font-normal">(opcional)</span>
                        </label>
                        <select
                            value={data.id_obra}
                            onChange={(e) => setData('id_obra', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#557bbb] focus:ring-[#557bbb] sm:text-sm"
                        >
                            <option value="">— Sem obra —</option>
                            {obras && obras.map(o => <option key={o.id} value={o.id}>{o.nome_fantasia || o.nome}</option>)}
                        </select>
                        <p className="text-xs text-gray-400 mt-1">
                            Vínculo com obra é opcional — o funcionário é da empresa, podendo estar ou não alocado em uma obra.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700">Data de Admissão</label>
                        <input
                            type="date"
                            value={data.data_adminssao}
                            onChange={(e) => setData('data_adminssao', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#557bbb] focus:ring-[#557bbb] sm:text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700">Data de Demissão</label>
                        <input
                            type="date"
                            value={data.data_demissao}
                            onChange={(e) => setData('data_demissao', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#557bbb] focus:ring-[#557bbb] sm:text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* DADOS PESSOAIS */}
            <div className="bg-white shadow-sm border border-gray-100 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Dados Pessoais</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700">CPF</label>
                        <input
                            type="text"
                            value={data.cpf}
                            onChange={(e) => setData('cpf', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#557bbb] focus:ring-[#557bbb] sm:text-sm"
                        />
                        {errors.cpf && <div className="text-rose-500 text-xs mt-1">{errors.cpf}</div>}
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700">RG</label>
                        <input
                            type="text"
                            value={data.rg}
                            onChange={(e) => setData('rg', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#557bbb] focus:ring-[#557bbb] sm:text-sm"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700">E-mail Pessoal</label>
                        <input
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#557bbb] focus:ring-[#557bbb] sm:text-sm"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700">Celular</label>
                        <input
                            type="text"
                            value={data.celular}
                            onChange={(e) => setData('celular', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#557bbb] focus:ring-[#557bbb] sm:text-sm"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700">Gênero</label>
                        <select
                            value={data.genero}
                            onChange={(e) => setData('genero', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#557bbb] focus:ring-[#557bbb] sm:text-sm"
                        >
                            <option value="">Selecione...</option>
                            <option value="M">Masculino</option>
                            <option value="F">Feminino</option>
                            <option value="Outro">Outro</option>
                        </select>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700">Estado Civil</label>
                        <select
                            value={data.estado_civil}
                            onChange={(e) => setData('estado_civil', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#557bbb] focus:ring-[#557bbb] sm:text-sm"
                        >
                            <option value="">Selecione...</option>
                            <option value="Solteiro(a)">Solteiro(a)</option>
                            <option value="Casado(a)">Casado(a)</option>
                            <option value="Divorciado(a)">Divorciado(a)</option>
                            <option value="Viúvo(a)">Viúvo(a)</option>
                        </select>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700">Nome da Mãe</label>
                        <input
                            type="text"
                            value={data.nome_mae}
                            onChange={(e) => setData('nome_mae', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#557bbb] focus:ring-[#557bbb] sm:text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700">PIS / PASEP</label>
                        <input
                            type="text"
                            value={data.pis}
                            onChange={(e) => setData('pis', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#557bbb] focus:ring-[#557bbb] sm:text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700">Dependentes</label>
                        <input
                            type="number"
                            min="0"
                            value={data.dependentes}
                            onChange={(e) => setData('dependentes', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#557bbb] focus:ring-[#557bbb] sm:text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* ENDEREÇO */}
            <div className="bg-white shadow-sm border border-gray-100 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Endereço</h3>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700">CEP</label>
                        <input
                            type="text"
                            value={data.cep}
                            onChange={(e) => setData('cep', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#557bbb] focus:ring-[#557bbb] sm:text-sm"
                        />
                    </div>

                    <div className="md:col-span-3">
                        <label className="block text-sm font-semibold text-gray-700">Logradouro</label>
                        <input
                            type="text"
                            value={data.endereco}
                            onChange={(e) => setData('endereco', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#557bbb] focus:ring-[#557bbb] sm:text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700">Número</label>
                        <input
                            type="text"
                            value={data.numero}
                            onChange={(e) => setData('numero', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#557bbb] focus:ring-[#557bbb] sm:text-sm"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700">Bairro</label>
                        <input
                            type="text"
                            value={data.bairro}
                            onChange={(e) => setData('bairro', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#557bbb] focus:ring-[#557bbb] sm:text-sm"
                        />
                    </div>

                    <div className="md:col-span-3">
                        <label className="block text-sm font-semibold text-gray-700">Cidade</label>
                        <input
                            type="text"
                            value={data.cidade}
                            onChange={(e) => setData('cidade', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#557bbb] focus:ring-[#557bbb] sm:text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700">UF</label>
                        <input
                            type="text"
                            maxLength="2"
                            value={data.estado}
                            onChange={(e) => setData('estado', e.target.value.toUpperCase())}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#557bbb] focus:ring-[#557bbb] sm:text-sm uppercase"
                        />
                    </div>
                </div>
            </div>

            {/* ACESSO AO SISTEMA (CRIAÇÃO DE USUÁRIO / PERMISSÕES) */}
            <div className={`bg-white shadow-sm border ${data.create_user ? 'border-[#557bbb]' : 'border-gray-100'} rounded-xl p-6 transition-colors duration-300`}>
                <div className="flex items-center justify-between mb-4 border-b pb-2">
                    <h3 className="text-lg font-bold text-gray-900">Acesso ao Sistema</h3>
                    <label className="flex items-center cursor-pointer gap-2">
                        <span className="text-sm font-semibold text-gray-700">Possui Acesso Web/Mobile?</span>
                        <div className="relative">
                            <input
                                type="checkbox"
                                className="sr-only"
                                checked={data.create_user}
                                onChange={(e) => {
                                    setData('create_user', e.target.checked);
                                    if(e.target.checked && !data.user_email) setData('user_email', data.email);
                                }}
                            />
                            <div className={`block w-10 h-6 rounded-full transition-colors ${data.create_user ? 'bg-[#557bbb]' : 'bg-gray-300'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${data.create_user ? 'transform translate-x-4' : ''}`}></div>
                        </div>
                    </label>
                </div>

                {data.create_user && (
                    <div className="animate-fade-in-up mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700">E-mail de Login</label>
                                <input
                                    type="email"
                                    value={data.user_email}
                                    onChange={(e) => setData('user_email', e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#557bbb] focus:ring-[#557bbb] sm:text-sm"
                                    required={data.create_user}
                                />
                                {errors.user_email && <div className="text-rose-500 text-xs mt-1">{errors.user_email}</div>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700">Senha {isEdit && linkedUser && <span className="font-normal text-xs text-gray-400">(vazio para manter)</span>}</label>
                                <input
                                    type="password"
                                    value={data.user_password}
                                    onChange={(e) => setData('user_password', e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#557bbb] focus:ring-[#557bbb] sm:text-sm"
                                    required={data.create_user && (!isEdit || !linkedUser)}
                                />
                                {errors.user_password && <div className="text-rose-500 text-xs mt-1">{errors.user_password}</div>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700">Nível de Acesso (Perfil)</label>
                                <select
                                    value={data.user_type}
                                    onChange={(e) => setData('user_type', e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#557bbb] focus:ring-[#557bbb] sm:text-sm"
                                >
                                    <option value="user">Usuário Padrão</option>
                                    <option value="admin">Administrador Sistêmico</option>
                                </select>
                            </div>
                        </div>

                        {data.user_type !== 'super_admin' && (
                            <div className="mt-6 border-t pt-4">
                                <h4 className="text-md font-bold text-gray-800 mb-4">Permissões de Módulo</h4>
                                {(!groupedModules || Object.keys(groupedModules).length === 0) ? (
                                    <p className="text-sm text-gray-500">Nenhum módulo disponível para configuração.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {Object.entries(groupedModules).map(([baseModuleId, group]) => {
                                            const baseModule = group.find(m => m.id.toString() === baseModuleId) || group[0];
                                            const isOpen = openPanels[baseModuleId] || false;
                                            return (
                                                <div key={baseModuleId} className={`border rounded-lg overflow-hidden transition-colors ${isOpen ? 'border-[#557bbb]' : 'border-gray-200'}`}>
                                                    <button
                                                        type="button"
                                                        onClick={() => togglePanel(baseModuleId)}
                                                        className={`w-full flex items-center justify-between px-4 py-3 text-left font-semibold focus:outline-none transition-colors ${isOpen ? 'bg-[#eef2f9] text-[#3a5a8c]' : 'bg-gray-50 hover:bg-gray-100'}`}
                                                    >
                                                        <span>{baseModule ? baseModule.name : `Módulo #${baseModuleId}`}</span>
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
                                                                            <tr key={mId} className="hover:bg-gray-50">
                                                                                <td className="px-2 py-3 font-medium text-gray-800">{module.name}</td>
                                                                                <td className="px-2 py-3 text-center"><input type="checkbox" checked={!!p.view} onChange={() => handlePermissionToggle(mId, 'view')} className="rounded border-gray-300 text-[#557bbb] focus:ring-[#557bbb] w-4 h-4 cursor-pointer" /></td>
                                                                                <td className="px-2 py-3 text-center"><input type="checkbox" checked={!!p.list} onChange={() => handlePermissionToggle(mId, 'list')} className="rounded border-gray-300 text-[#557bbb] focus:ring-[#557bbb] w-4 h-4 cursor-pointer" /></td>
                                                                                <td className="px-2 py-3 text-center"><input type="checkbox" checked={!!p.create} onChange={() => handlePermissionToggle(mId, 'create')} className="rounded border-gray-300 text-[#557bbb] focus:ring-[#557bbb] w-4 h-4 cursor-pointer" /></td>
                                                                                <td className="px-2 py-3 text-center"><input type="checkbox" checked={!!p.edit} onChange={() => handlePermissionToggle(mId, 'edit')} className="rounded border-gray-300 text-[#557bbb] focus:ring-[#557bbb] w-4 h-4 cursor-pointer" /></td>
                                                                                <td className="px-2 py-3 text-center"><input type="checkbox" checked={!!p.delete} onChange={() => handlePermissionToggle(mId, 'delete')} className="rounded border-gray-300 text-rose-500 focus:ring-rose-500 w-4 h-4 cursor-pointer" /></td>
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
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
                <Link
                    href={route('admin.funcionarios.index')}
                    className="px-6 py-2.5 rounded-lg font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none transition-colors"
                >
                    Cancelar
                </Link>
                <button
                    type="submit"
                    disabled={processing}
                    className={`px-8 py-2.5 rounded-lg font-bold text-white shadow-md transition-all ${processing ? 'bg-gray-400 cursor-not-allowed hidden' : 'bg-[#557bbb] hover:bg-[#3a5a8c] hover:-translate-y-0.5 hover:shadow-lg'}`}
                >
                    {isEdit ? 'Salvar Alterações' : 'Cadastrar Funcionário'}
                </button>
            </div>
        </form>
        </>
    );
}
