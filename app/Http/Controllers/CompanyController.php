<?php

namespace App\Http\Controllers;

use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class CompanyController extends Controller
{
    public function index(Request $request)
    {
        $isAdmin = $this->isAdminRoute($request);
        $companies = $isAdmin
            ? Company::query()->orderBy('name')->get()
            : $request->user()->companies()->orderBy('name')->get();

        return Inertia::render('Admin/Companies/Index', [
            'companies' => $companies,
            'canManage' => $isAdmin,
            'createRoute' => $isAdmin ? 'companies.create' : 'companies.setup.create',
        ]);
    }

    public function create(Request $request)
    {
        $isAdmin = $this->isAdminRoute($request);

        return Inertia::render('Admin/Companies/Create', [
            'pageTitle' => 'Nova Empresa',
            'formAction' => $isAdmin ? route('companies.store') : route('companies.setup.store'),
            'cancelRoute' => $isAdmin ? 'companies.index' : 'companies.select',
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'          => 'required|string|max:255',
            'nome_fantasia' => 'nullable|string|max:255',
            'razao_social'  => 'nullable|string|max:255',
            'cnpj'          => 'nullable|string|max:20',
            'cep'           => 'nullable|string|max:10',
            'endereco'      => 'nullable|string|max:255',
            'numero'        => 'nullable|string|max:50',
            'bairro'        => 'nullable|string|max:255',
            'cidade'        => 'nullable|string|max:255',
            'estado'        => 'nullable|string|max:2',
            'email'         => 'nullable|email|max:255',
            'celular'       => 'nullable|string|max:20',
            'is_active'     => 'nullable|boolean',
        ]);

        $validated['slug'] = Str::slug($validated['name']);
        if (!isset($validated['is_active'])) {
            $validated['is_active'] = true;
        }

        $company = Company::create($validated);

        // vincula o usuário logado como owner
        $request->user()->companies()->syncWithoutDetaching([
            $company->id => ['role' => 'owner'],
        ]);

        $route = $request->routeIs('companies.store')
            ? 'companies.index'
            : 'companies.select';

        return redirect()->route($route)->with('message', 'Empresa cadastrada!');
    }

    public function select(Request $request)
    {
        $user = $request->user();
        
        if (in_array($user->type, ['super_admin', 'admin'])) {
            $companies = Company::with(['obras' => function($q) {
                $q->withoutGlobalScope(\App\Models\Scopes\CompanyScope::class);
            }])->orderBy('name')->get();
        } else {
            // Carrega empresas vinculadas e APENAS as obras vinculadas a esse usuário ignorando o escopo atual
            $companies = $user->companies()->with(['obras' => function($q) use ($user) {
                $q->withoutGlobalScope(\App\Models\Scopes\CompanyScope::class)
                  ->whereIn('obras.id', $user->obras()->pluck('obras.id'));
            }])->orderBy('name')->get();
        }

        return Inertia::render('Admin/Companies/Select', [
            'companies' => $companies
        ]);
    }

    public function set(Request $request)
    {
        $request->validate([
            'company_id' => 'required|exists:companies,id',
            'obra_id'    => 'nullable|exists:obras,id',
        ]);

        session(['current_company_id' => $request->company_id]);
        
        if ($request->filled('obra_id')) {
            session(['current_obra_id' => $request->obra_id]);
        } else {
            session()->forget('current_obra_id');
        }

        // Após escolher empresa (e obra), vai para o dashboard — não para a
        // landing "/". Usa intended() pra respeitar uma URL pretendida que tenha
        // sobrado do login; cai no dashboard quando não há. Mesmo padrão do
        // ObraSelectionController@set.
        return redirect()->intended(route('dashboard'))->with('message', 'Ambiente selecionado com sucesso!');
    }

    public function show(Company $company)
    {
        return Inertia::render('Admin/Companies/Show', [
            'company' => $company
        ]);
    }

    public function edit(Company $company)
    {
        return Inertia::render('Admin/Companies/Edit', [
            'company' => $company
        ]);
    }

    public function update(Request $request, Company $company)
    {
        $validated = $request->validate([
            'name'          => 'required|string|max:255',
            'nome_fantasia' => 'nullable|string|max:255',
            'razao_social'  => 'nullable|string|max:255',
            'cnpj'          => 'nullable|string|max:20',
            'cep'           => 'nullable|string|max:10',
            'endereco'      => 'nullable|string|max:255',
            'numero'        => 'nullable|string|max:50',
            'bairro'        => 'nullable|string|max:255',
            'cidade'        => 'nullable|string|max:255',
            'estado'        => 'nullable|string|max:2',
            'email'         => 'nullable|email|max:255',
            'celular'       => 'nullable|string|max:20',
            'is_active'     => 'nullable|boolean',
        ]);

        $validated['slug'] = Str::slug($validated['name']);

        $company->update($validated);

        return redirect()
            ->route('companies.index')
            ->with('message', 'Empresa atualizada com sucesso.');
    }

    public function destroy(Request $request, Company $company)
    {
        if ((int) session('current_company_id') === (int) $company->id) {
            session()->forget('current_company_id');
        }

        $company->delete();

        return redirect()
            ->route('companies.index')
            ->with('message', 'Empresa removida com sucesso.');
    }

    private function isAdminRoute(Request $request): bool
    {
        return $request->routeIs(
            'companies.index',
            'companies.create',
            'companies.store',
            'companies.show',
            'companies.edit',
            'companies.update',
            'companies.destroy',
        );
    }
}
