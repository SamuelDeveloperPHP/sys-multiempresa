<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Fornecedor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class FornecedorController extends Controller
{
    public function index(Request $request): InertiaResponse
    {
        $query = Fornecedor::query();

        if ($q = $request->string('q')->trim()->value()) {
            $query->where(function ($w) use ($q) {
                $w->where('nome_fantasia', 'like', "%{$q}%")
                  ->orWhere('razao_social', 'like', "%{$q}%")
                  ->orWhere('cnpj', 'like', "%{$q}%");
            });
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        return Inertia::render('Admin/Fornecedores/Index', [
            'fornecedores' => $query->orderBy('nome_fantasia')->paginate(30)->withQueryString(),
            'filtros'      => $request->only(['q', 'status']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validar($request);
        $data['user_create'] = Auth::user()?->email;
        Fornecedor::create($data);

        return back()->with('success', 'Fornecedor cadastrado.');
    }

    public function update(Request $request, Fornecedor $fornecedor): RedirectResponse
    {
        $data = $this->validar($request);
        $data['user_edit'] = Auth::user()?->email;
        $fornecedor->update($data);

        return back()->with('success', 'Fornecedor atualizado.');
    }

    public function destroy(Fornecedor $fornecedor): RedirectResponse
    {
        $fornecedor->delete();
        return back()->with('success', 'Fornecedor removido.');
    }

    protected function validar(Request $request): array
    {
        return $request->validate([
            'nome_fantasia'       => 'required|string|max:191',
            'razao_social'        => 'nullable|string|max:191',
            'atividade_principal' => 'nullable|string|max:100',
            'cnpj'                => 'nullable|string|max:20',
            'cpf'                 => 'nullable|string|max:20',
            'cep'                 => 'nullable|string|max:15',
            'endereco'            => 'nullable|string|max:191',
            'numero'              => 'nullable|string|max:20',
            'bairro'              => 'nullable|string|max:100',
            'cidade'              => 'nullable|string|max:100',
            'estado'              => 'nullable|string|max:2',
            'email'               => 'nullable|email|max:191',
            'celular'             => 'nullable|string|max:30',
            'id_obra'             => 'nullable|exists:obras,id',
            'status'              => 'nullable|in:Ativo,Inativo',
        ]);
    }
}
