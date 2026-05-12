<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\CompanyContext;
use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Obra;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class ObraController extends Controller
{
    // ----------------------------------------------------------------
    // LIST
    // ----------------------------------------------------------------
    public function index(Request $request)
    {
        try {
            $companyId = CompanyContext::id();

            $query = Obra::where('company_id', $companyId);

            if ($search = $request->input('q')) {
                $query->where(function ($q) use ($search) {
                    $q->where('nome_fantasia', 'like', "%{$search}%")
                      ->orWhere('razao_social', 'like', "%{$search}%")
                      ->orWhere('code', 'like', "%{$search}%")
                      ->orWhere('cnpj', 'like', "%{$search}%");
                });
            }

            if ($status = $request->input('status')) {
                $query->where('status', $status);
            }

            $obras   = $query->orderBy('nome_fantasia')->paginate(20)->withQueryString();
            $filters = $request->only(['q', 'status']);

            return Inertia::render('Admin/Obras/Index', [
                'obras' => $obras,
                'filters' => $filters,
            ]);
        } catch (\Throwable $e) {
            Log::error('Erro ao listar obras', ['error' => $e->getMessage()]);
            return redirect()->back()->withErrors(['error' => 'Erro ao carregar obras.']);
        }
    }

    // ----------------------------------------------------------------
    // CREATE
    // ----------------------------------------------------------------
    public function create()
    {
        $companies = $this->availableCompanies();

        return Inertia::render('Admin/Obras/Create', [
            'statuses'  => Obra::$statuses,
            'companies' => $companies,
        ]);
    }

    // ----------------------------------------------------------------
    // STORE
    // ----------------------------------------------------------------
    public function store(Request $request)
    {
        $validated = $this->validateObra($request);

        // Garante que só pode criar obra para empresa à qual tem acesso
        $this->authorizeCompanyAccess($validated['company_id']);

        $obra = Obra::create($validated);

        // Vincula o usuário logado automaticamente como admin da nova obra
        $obra->users()->syncWithoutDetaching([
            auth()->id() => ['role' => 'admin'],
        ]);

        return redirect()->route('admin.obras.index')
            ->with('message', 'Obra criada com sucesso.');
    }

    // ----------------------------------------------------------------
    // SHOW
    // ----------------------------------------------------------------
    public function show(Obra $obra)
    {
        $this->authorizeObra($obra);

        $obra->load('company', 'users');

        return Inertia::render('Admin/Obras/Show', [
            'obra'     => $obra,
            'statuses' => Obra::$statuses,
        ]);
    }

    // ----------------------------------------------------------------
    // EDIT
    // ----------------------------------------------------------------
    public function edit(Obra $obra)
    {
        $this->authorizeObra($obra);

        $companies = $this->availableCompanies();

        return Inertia::render('Admin/Obras/Edit', [
            'obra'      => $obra,
            'statuses'  => Obra::$statuses,
            'companies' => $companies,
        ]);
    }

    // ----------------------------------------------------------------
    // UPDATE
    // ----------------------------------------------------------------
    public function update(Request $request, Obra $obra)
    {
        $this->authorizeObra($obra);

        $validated = $this->validateObra($request, $obra);

        $obra->update($validated);

        return redirect()->route('admin.obras.index')
            ->with('message', 'Obra atualizada com sucesso.');
    }

    // ----------------------------------------------------------------
    // DESTROY
    // ----------------------------------------------------------------
    public function destroy(Obra $obra)
    {
        $this->authorizeObra($obra);

        $obra->delete();

        return redirect()->route('admin.obras.index')
            ->with('message', 'Obra removida com sucesso.');
    }

    // ----------------------------------------------------------------
    // USUÁRIOS DA OBRA
    // ----------------------------------------------------------------
    public function users(Obra $obra)
    {
        $this->authorizeObra($obra);

        $obra->load('users');
        $companyUsers = $obra->company->users()->get();

        return Inertia::render('Admin/Obras/Users', [
            'obra' => $obra,
            'companyUsers' => $companyUsers,
        ]);
    }

    public function attachUser(Request $request, Obra $obra)
    {
        $this->authorizeObra($obra);

        $request->validate([
            'user_id' => 'required|exists:users,id',
            'role'    => 'required|in:admin,member,viewer',
        ]);

        $obra->users()->syncWithoutDetaching([
            $request->user_id => ['role' => $request->role],
        ]);

        return back()->with('message', 'Usuário vinculado à obra.');
    }

    public function detachUser(Request $request, Obra $obra, User $user)
    {
        $this->authorizeObra($obra);

        $obra->users()->detach($user->id);

        return back()->with('message', 'Usuário removido da obra.');
    }

    // ----------------------------------------------------------------
    // HELPERS PRIVADOS
    // ----------------------------------------------------------------
    private function validateObra(Request $request, ?Obra $obra = null): array
    {
        return $request->validate([
            'company_id'    => 'required|exists:companies,id',
            'nome_fantasia' => 'required|string|max:191',
            'razao_social'  => 'nullable|string|max:191',
            'cnpj'          => 'nullable|string|max:20',
            'code'          => 'nullable|string|max:100',
            'cep'           => 'nullable|string|max:10',
            'endereco'      => 'nullable|string|max:191',
            'numero'        => 'nullable|string|max:20',
            'complemento'   => 'nullable|string|max:100',
            'bairro'        => 'nullable|string|max:191',
            'cidade'        => 'nullable|string|max:191',
            'estado'        => 'nullable|string|max:2',
            'email'         => 'nullable|email|max:191',
            'celular'       => 'nullable|string|max:20',
            'status'        => 'required|in:Ativa,Concluida,Paralisada,Cancelada',
            'started_at'    => 'nullable|date',
            'ended_at'      => 'nullable|date|after_or_equal:started_at',
        ]);
    }

    private function authorizeObra(Obra $obra): void
    {
        $user = auth()->user();

        if ($user->type === 'super_admin') {
            return;
        }

        // Admin da empresa pode ver todas as obras da empresa
        $companyId = CompanyContext::id();
        if ($obra->company_id !== $companyId) {
            abort(403);
        }
    }

    private function authorizeCompanyAccess(int $companyId): void
    {
        $user = auth()->user();

        if ($user->type === 'super_admin') {
            return;
        }

        $hasAccess = $user->companies()->where('companies.id', $companyId)->exists();

        if (! $hasAccess) {
            abort(403);
        }
    }

    private function availableCompanies()
    {
        $user = auth()->user();

        if ($user->type === 'super_admin') {
            return Company::orderBy('name')->get();
        }

        return $user->companies()->orderBy('name')->get();
    }
}
