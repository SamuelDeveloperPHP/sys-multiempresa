<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Module;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Throwable;

class ModuleController extends Controller
{
    // app/Http/Controllers/Admin/ModuleController.php

public function index(Request $request)
{
    try {
        $query = Module::query();

        // Busca por nome / slug / route_name
        if ($search = $request->input('q')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('slug', 'like', "%{$search}%")
                  ->orWhere('route_name', 'like', "%{$search}%");
            });
        }

        // Filtro de status (ativo / inativo)
        if ($status = $request->input('status')) {
            if ($status === 'active') {
                $query->where('is_active', 1);
            } elseif ($status === 'inactive') {
                $query->where('is_active', 0);
            }
        }

        // Filtro de exibição no menu
        if ($menu = $request->input('menu')) {
            if ($menu === 'show') {
                $query->where('show_in_menu', 1);
            } elseif ($menu === 'hide') {
                $query->where('show_in_menu', 0);
            }
        }

        $modules = $query
            ->orderBy('name')
            ->paginate(9)
            ->withQueryString(); // mantém os filtros na paginação

        $filters = $request->only(['q', 'status', 'menu']);

        return Inertia::render('Admin/Modules/Index', [
            'modules' => $modules,
            'filters' => $filters,
        ]);
    } catch (\Throwable $e) {
        Log::error('Erro ao listar módulos', [
            'filtros' => $request->all(),
            'msg'     => $e->getMessage(),
            'file'    => $e->getFile(),
            'line'    => $e->getLine(),
            'trace'   => $e->getTraceAsString(),
        ]);

        $short = mb_substr($e->getMessage(), 0, 120);

        return redirect()->back()->withErrors([
            'error' => "Falha ao listar módulos. Erro: {$short} (linha {$e->getLine()})",
        ]);
    }
}


    public function create()
    {
        try {
            $allModules = Module::orderBy('name')->get();

            return Inertia::render('Admin/Modules/Create', [
                'parentModules' => $allModules
            ]);
        } catch (Throwable $e) {
            Log::error('Erro ao carregar formulário de criação de módulo', [
                'msg'   => $e->getMessage(),
                'file'  => $e->getFile(),
                'line'  => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

            $short = mb_substr($e->getMessage(), 0, 120);

            return redirect()->back()->withErrors([
                'error' => "Falha ao carregar formulário. Erro: {$short} (linha {$e->getLine()})",
            ]);
        }
    }

    public function store(Request $request)
    {

        //dd($request->all());

        try {
            $data = $request->validate([
                'name'                  => 'required|string|max:255',
                'slug'                  => 'nullable|string|max:255|unique:modules,slug',
                'route_name'            => 'nullable|string|max:255',
                'icon'                  => 'nullable|string|max:255',
                'url'                   => 'nullable|string|max:255',
                'parent_id'             => 'nullable|integer|exists:modules,id',
                'id_modulo_relacionamento' => 'nullable|integer|exists:modules,id',
                'ordem'                 => 'nullable|integer',
                'sort_order'            => 'nullable|integer',
                'is_active'             => 'boolean',
                'show_in_menu'          => 'boolean',
            ]);

            if (empty($data['slug'])) {
                $data['slug'] = Str::slug($data['name']);
            }

            $data['is_active']   = $request->boolean('is_active');
            $data['show_in_menu'] = $request->boolean('show_in_menu');

            Module::create($data);

            return redirect()
                ->route('admin.modules.index')
                ->with('success', 'Módulo criado com sucesso.');
        } catch (Throwable $e) {
            Log::error('Erro ao criar módulo', [
                'dados' => $request->all(),
                'msg'   => $e->getMessage(),
                'file'  => $e->getFile(),
                'line'  => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

            $short = mb_substr($e->getMessage(), 0, 120);

            return redirect()
                ->back()
                ->withInput()
                ->withErrors([
                    'error' => "Falha ao criar módulo. Erro: {$short} (linha {$e->getLine()})",
                ]);
        }
    }

    public function show(Module $module)
    {
        try {
            return view('admin.modules.show', compact('module'));
        } catch (Throwable $e) {
            Log::error('Erro ao exibir módulo', [
                'module_id' => $module->id ?? null,
                'msg'       => $e->getMessage(),
                'file'      => $e->getFile(),
                'line'      => $e->getLine(),
            ]);

            $short = mb_substr($e->getMessage(), 0, 120);

            return redirect()->back()->withErrors([
                'error' => "Falha ao exibir módulo. Erro: {$short} (linha {$e->getLine()})",
            ]);
        }
    }

    public function edit(Module $module)
    {
        try {
            $allModules = Module::where('id', '!=', $module->id)->orderBy('name')->get();

            return Inertia::render('Admin/Modules/Edit', [
                'module' => $module,
                'parentModules' => $allModules
            ]);
        } catch (Throwable $e) {
            Log::error('Erro ao carregar formulário de edição de módulo', [
                'module_id' => $module->id ?? null,
                'msg'       => $e->getMessage(),
                'file'      => $e->getFile(),
                'line'      => $e->getLine(),
                'trace'     => $e->getTraceAsString(),
            ]);

            $short = mb_substr($e->getMessage(), 0, 120);

            return redirect()->back()->withErrors([
                'error' => "Falha ao carregar formulário de edição. Erro: {$short} (linha {$e->getLine()})",
            ]);
        }
    }

    public function update(Request $request, Module $module)
    {
        try {
            $data = $request->validate([
                'name'                  => 'required|string|max:255',
                'slug'                  => 'nullable|string|max:255|unique:modules,slug,' . $module->id,
                'route_name'            => 'nullable|string|max:255',
                'icon'                  => 'nullable|string|max:255',
                'url'                   => 'nullable|string|max:255',
                'parent_id'             => 'nullable|integer|exists:modules,id',
                'id_modulo_relacionamento' => 'nullable|integer|exists:modules,id',
                'ordem'                 => 'nullable|integer',
                'sort_order'            => 'nullable|integer',
                'is_active'             => 'boolean',
                'show_in_menu'          => 'boolean',
            ]);

            if (empty($data['slug'])) {
                $data['slug'] = Str::slug($data['name']);
            }

            $data['is_active']   = $request->boolean('is_active');
            $data['show_in_menu'] = $request->boolean('show_in_menu');

            $module->update($data);

            return redirect()
                ->route('admin.modules.index')
                ->with('success', 'Módulo atualizado com sucesso.');
        } catch (Throwable $e) {
            Log::error('Erro ao atualizar módulo', [
                'module_id' => $module->id ?? null,
                'dados'     => $request->all(),
                'msg'       => $e->getMessage(),
                'file'      => $e->getFile(),
                'line'      => $e->getLine(),
                'trace'     => $e->getTraceAsString(),
            ]);

            $short = mb_substr($e->getMessage(), 0, 120);

            return redirect()
                ->back()
                ->withInput()
                ->withErrors([
                    'error' => "Falha ao atualizar módulo. Erro: {$short} (linha {$e->getLine()})",
                ]);
        }
    }

    public function destroy(Module $module)
    {
        try {
            $module->delete();

            return redirect()
                ->route('admin.modules.index')
                ->with('success', 'Módulo removido com sucesso.');
        } catch (Throwable $e) {
            Log::error('Erro ao remover módulo', [
                'module_id' => $module->id ?? null,
                'msg'       => $e->getMessage(),
                'file'      => $e->getFile(),
                'line'      => $e->getLine(),
                'trace'     => $e->getTraceAsString(),
            ]);

            $short = mb_substr($e->getMessage(), 0, 120);

            return redirect()
                ->back()
                ->withErrors([
                    'error' => "Falha ao remover módulo. Erro: {$short} (linha {$e->getLine()})",
                ]);
        }
    }
}
