<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laragear\WebAuthn\Contracts\WebAuthnAuthenticatable;
use Laragear\WebAuthn\WebAuthnAuthentication;

/**
 * Funcionário da OBRA (não confunda com User do sistema).
 *
 * - Tem matrícula, função, setor, foto, CPF — cadastro completo do RH.
 * - NÃO precisa ter login no sistema; motorista usa app mobile próprio,
 *   demais funcionários podem nem ter acesso ao sistema.
 * - PODE ter biometria WebAuthn vinculada (uso: validar retirada de estoque).
 * - PODE ter senha_retirada simples (4–6 dígitos) para validar retirada
 *   quando não tem biometria cadastrada.
 *
 * Implementa Authenticatable + WebAuthnAuthenticatable para que o pipeline
 * do laragear/webauthn grave credenciais vinculadas via
 * authenticatable_type = App\Models\Funcionario (separadas dos Users).
 */
class Funcionario extends Authenticatable implements WebAuthnAuthenticatable
{
    use HasFactory, SoftDeletes, Traits\Tenantable, WebAuthnAuthentication;

    protected $table = 'funcionarios';

    protected $fillable = [
        'company_id', 'id_obra', 'id_funcao', 'id_setor',
        'nome', 'matricula', 'cpf', 'status', 'imagem_usuario',
        'rg', 'cep', 'endereco', 'numero', 'bairro', 'cidade', 'estado',
        'email', 'celular', 'nome_mae', 'genero', 'pis', 'estado_civil',
        'dependentes', 'data_adminssao', 'data_demissao', 'situacao', 'afastado',
        // Auth para retirada de estoque
        'senha_retirada', 'data_ultima_retirada',
    ];

    protected $hidden = ['senha_retirada', 'remember_token'];

    protected $casts = [
        'senha_retirada'       => 'hashed',
        'data_ultima_retirada' => 'datetime',
        'data_adminssao'       => 'date',
        'data_demissao'        => 'date',
    ];

    public function obra()   { return $this->belongsTo(Obra::class, 'id_obra'); }
    public function funcao() { return $this->belongsTo(FuncionarioFuncao::class, 'id_funcao'); }
    public function setor()  { return $this->belongsTo(FuncionarioSetor::class, 'id_setor'); }

    public function users()
    {
        return $this->belongsToMany(User::class, 'user_funcionario');
    }

    /**
     * Authenticatable exige getAuthPassword(). O Funcionario não tem senha
     * de login tradicional — retornamos a senha_retirada quando existe.
     */
    public function getAuthPassword()
    {
        return $this->senha_retirada ?? '';
    }
}
