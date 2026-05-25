<?php

namespace App\Http\Controllers\Admin\Estoque;

use App\Helpers\CompanyContext;
use App\Http\Controllers\Controller;
use App\Http\Requests\Estoque\CategoriaRequest;
use App\Models\Estoque\Categoria;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Categorias de produtos — árvore via parent_id.
 *
 * Tela: /admin/estoque/categorias
 */
class CategoriaController extends Controller
{
    public function index(Request $request)
    {
        $companyId = CompanyContext::current()?->id;

        // Carrega todas, monta a árvore no controller (poucas dezenas geralmente)
        $todas = Categoria::query()
            ->where('company_id', $companyId)
            ->orderBy('ordem')
            ->orderBy('nome')
            ->get(['id', 'parent_id', 'nome', 'descricao', 'ordem', 'ativo'])
            ->map(fn ($c) => $c->toArray() + ['filhos' => []])
            ->keyBy('id')
            ->all();

        $raizes = [];
        foreach ($todas as $id => &$cat) {
            if ($cat['parent_id'] && isset($todas[$cat['parent_id']])) {
                $todas[$cat['parent_id']]['filhos'][] = &$cat;
            } else {
                $raizes[] = &$cat;
            }
        }
        unset($cat);

        return Inertia::render('Admin/Estoque/Categorias/Index', [
            'arvore'      => array_values($raizes),
            'todasFlat'   => array_values($todas),
        ]);
    }

    public function store(CategoriaRequest $request)
    {
        $companyId = CompanyContext::current()?->id;

        Categoria::create([
            'company_id'  => $companyId,
            'parent_id'   => $request->input('parent_id') ?: null,
            'nome'        => $request->input('nome'),
            'descricao'   => $request->input('descricao'),
            'ordem'       => (int) $request->input('ordem', 0),
            'ativo'       => $request->boolean('ativo', true),
            'user_create' => $request->user()->email,
        ]);

        return back()->with('success', 'Categoria criada.');
    }

    public function update(CategoriaRequest $request, Categoria $categoria)
    {
        abort_if($categoria->company_id !== CompanyContext::current()?->id, 403);

        $categoria->update([
            'parent_id' => $request->input('parent_id') ?: null,
            'nome'      => $request->input('nome'),
            'descricao' => $request->input('descricao'),
            'ordem'     => (int) $request->input('ordem', 0),
            'ativo'     => $request->boolean('ativo', true),
            'user_edit' => $request->user()->email,
        ]);

        return back()->with('success', 'Categoria atualizada.');
    }

    public function destroy(Request $request, Categoria $categoria)
    {
        abort_if($categoria->company_id !== CompanyContext::current()?->id, 403);

        // Bloqueia se tem produtos
        if ($categoria->produtos()->exists()) {
            return back()->with('error', 'Categoria tem produtos vinculados. Remova-os antes.');
        }
        // Bloqueia se tem filhos
        if ($categoria->children()->exists()) {
            return back()->with('error', 'Categoria tem subcategorias. Remova-as antes.');
        }

        $categoria->delete();
        return back()->with('success', 'Categoria excluída.');
    }
}
