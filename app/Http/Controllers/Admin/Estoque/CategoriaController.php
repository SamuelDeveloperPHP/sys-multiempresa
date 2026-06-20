<?php

namespace App\Http\Controllers\Admin\Estoque;

use App\Http\Controllers\Controller;
use App\Http\Requests\Estoque\CategoriaRequest;
use App\Models\Estoque\Categoria;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Categorias de produtos — CATÁLOGO GLOBAL (não filtra por empresa).
 *
 * Tela: /admin/estoque/categorias
 */
class CategoriaController extends Controller
{
    public function index(Request $request)
    {
        // Carrega todas — catálogo é global
        $todas = Categoria::query()
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
            'arvore'    => array_values($raizes),
            'todasFlat' => array_values($todas),
        ]);
    }

    public function store(CategoriaRequest $request)
    {
        Categoria::create([
            'company_id'  => null, // global
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

    /**
     * Move uma categoria para outro pai (ou para a raiz) via drag-and-drop.
     *
     * Regras:
     *   - novo_parent_id null = vira raiz.
     *   - NÃO permite mover para si mesma nem para uma DESCENDENTE (evita ciclo).
     *   - ordem opcional (posição entre irmãos).
     */
    public function mover(Request $request, Categoria $categoria)
    {
        $data = $request->validate([
            'novo_parent_id' => ['nullable', 'integer', 'exists:estoque_categorias,id'],
            'ordem'          => ['nullable', 'integer', 'min:0'],
        ]);

        $novoParent = $data['novo_parent_id'] ?? null;

        // Não pode ser pai de si mesma
        if ($novoParent && (int) $novoParent === $categoria->id) {
            return back()->with('error', 'Uma categoria não pode ser pai de si mesma.');
        }

        // Não pode mover para uma descendente (geraria ciclo)
        if ($novoParent && $this->ehDescendente($categoria->id, (int) $novoParent)) {
            return back()->with('error', 'Não é possível mover uma categoria para dentro de uma subcategoria dela mesma.');
        }

        $categoria->update([
            'parent_id' => $novoParent ?: null,
            'ordem'     => $data['ordem'] ?? $categoria->ordem,
            'user_edit' => $request->user()->email,
        ]);

        return back()->with('success', "Categoria \"{$categoria->nome}\" movida.");
    }

    /**
     * $possivelDescendenteId está na subárvore de $ancestralId?
     * Sobe a partir do nó-alvo até a raiz procurando o ancestral.
     */
    protected function ehDescendente(int $ancestralId, int $possivelDescendenteId): bool
    {
        $atual = Categoria::find($possivelDescendenteId);
        $guard = 0;
        while ($atual && $atual->parent_id && $guard++ < 1000) {
            if ((int) $atual->parent_id === $ancestralId) {
                return true;
            }
            $atual = Categoria::find($atual->parent_id);
        }
        return false;
    }

    public function destroy(Request $request, Categoria $categoria)
    {
        // Bloqueia se tem produtos vinculados
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
