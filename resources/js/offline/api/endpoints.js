// resources/js/offline/api/endpoints.js
// -----------------------------------------------------------------------------
// Endpoints centralizados do módulo Mobile.
// Todas as URLs são relativas ao baseURL '/api/mobile' do apiClient.
// -----------------------------------------------------------------------------

export const ENDPOINTS = {
    // Catálogos (GET only)
    veiculos: {
        list: '/veiculos',
        show: (id) => `/veiculos/${id}`,
    },
    fornecedores: '/fornecedores',
    categorias: '/categorias',
    obras: '/obras',

    // Transacionais (CRUD)
    abastecimentos: {
        list: '/abastecimentos',
        show: (id) => `/abastecimentos/${id}`,
        create: '/abastecimentos',
        update: (id) => `/abastecimentos/${id}`,
        delete: (id) => `/abastecimentos/${id}`,
        byVeiculo: (veiculoId) => `/veiculos/${veiculoId}/abastecimentos`,
    },

    diarioBordo: {
        list: '/diario-bordo',
        show: (id) => `/diario-bordo/${id}`,
        create: '/diario-bordo',
        update: (id) => `/diario-bordo/${id}`,
        delete: (id) => `/diario-bordo/${id}`,
        byVeiculo: (veiculoId) => `/veiculos/${veiculoId}/diario-bordo`,
    },

    checklists: {
        list: '/checklists',
        byVeiculo: (veiculoId) => `/veiculos/${veiculoId}/checklists`,
        // Compat (deprecated)
        byObra: (obraId) => `/obras/${obraId}/checklists`,
    },

    checklistServicos: {
        list: '/checklist-servicos',
        show: (id) => `/checklist-servicos/${id}`,
        create: '/checklist-servicos',
        update: (id) => `/checklist-servicos/${id}`,
        delete: (id) => `/checklist-servicos/${id}`,
        byVeiculo: (veiculoId) => `/veiculos/${veiculoId}/checklist-servicos`,
    },

    locacoes: {
        list: '/locacoes',
        byVeiculo: (veiculoId) => `/veiculos/${veiculoId}/locacoes`,
    },
};

export default ENDPOINTS;
