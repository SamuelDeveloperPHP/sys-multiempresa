<?php 

// app/Http/Controllers/UserController.php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use App\Mail\UserUnlockedMail;

class UserController extends Controller
{
    public function index()
    {
        $users = User::with('companies')
            ->orderBy('name')
            ->paginate(15);

        return view('users.index', compact('users'));
    }

    public function create()
    {
        $companies = Company::orderBy('name')->get();

        return view('users.create', compact('companies'));
    }

    public function store(Request $request)
    {
        $data = $this->validateUser($request, true);

        $user = User::create([
            'name'      => $data['name'],
            'email'     => $data['email'],
            'password'  => Hash::make($data['password']),
            'is_active' => $data['is_active'] ?? false,
            'type'      => $data['type'] ?? 'user',
        ]);

        // Vincula empresas marcadas
        $user->companies()->sync($data['companies'] ?? []);

        return redirect()->route('users.index')
            ->with('success', 'Usuário criado com sucesso!');
    }

    public function show(User $user)
    {
        $user->load('companies');

        return view('users.show', compact('user'));
    }

    public function edit(User $user)
    {
        $companies      = Company::orderBy('name')->get();
        $selectedCompanies = $user->companies->pluck('id')->toArray();

        return view('users.edit', compact('user', 'companies', 'selectedCompanies'));
    }

    public function update(Request $request, User $user)
    {
        $data = $this->validateUser($request, false, $user->id);

        $user->name  = $data['name'];
        $user->email = $data['email'];
        $user->type  = $data['type'] ?? $user->type;

        // Se veio senha, troca
        if (!empty($data['password'])) {
            $user->password = Hash::make($data['password']);
        }

        // não mexe em is_active aqui, só na tela de bloquear/desbloquear
        $user->save();

        $user->companies()->sync($data['companies'] ?? []);

        return redirect()->route('users.index')
            ->with('success', 'Usuário atualizado com sucesso!');
    }

    public function destroy(User $user)
    {
        // se preferir, pode só dar soft delete; aqui vou deletar de fato
        $user->delete();

        return redirect()->route('users.index')
            ->with('success', 'Usuário removido.');
    }

    public function toggleActive(User $user)
    {
        $user->is_active = !$user->is_active;
        $user->save();

        // Se acabou de ser liberado, manda e-mail de boas vindas
        if ($user->is_active) {
            Mail::to($user->email)->send(new UserUnlockedMail($user));
        }

        return back()->with('success', $user->is_active
            ? 'Usuário desbloqueado e liberado para acesso.'
            : 'Usuário bloqueado com sucesso.');
    }

    /**
     * Validação com regra de senha “forte”.
     */
    protected function validateUser(Request $request, bool $creating = true, ?int $userId = null): array
    {
        $passwordRule = [
            'nullable',
            'string',
            'min:8',
            // pelo menos 1 maiúscula, 1 caractere especial, 1 número
            // não permite sequências tipo 012,123,... e nem 3 números repetidos (111, 222, 3333)
            'regex:/^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};\'":\\|,.<>\/?])(?=.*\d)(?!.*(?:012|123|234|345|456|567|678|789))(?!.*(\d)\1\1).{8,}$/',
        ];

        if ($creating) {
            // ao criar é obrigatório
            $passwordRule[0] = 'required';
        }

        $data = $request->validate([
            'name'  => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($userId),
            ],
            'password' => $passwordRule,
            'type'     => ['nullable', 'string', Rule::in(['super_admin', 'admin', 'user'])],
            'is_active'=> ['nullable', 'boolean'],
            'companies'   => ['nullable', 'array'],
            'companies.*' => ['exists:companies,id'],
        ], [
            'password.regex' => 'A senha deve ter: 1 letra maiúscula, 1 caractere especial, 1 número e não pode conter sequências numéricas (123, 456) ou números repetidos (111).',
        ]);

        return $data;
    }
}
