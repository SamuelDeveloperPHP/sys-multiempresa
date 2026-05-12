<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Obra extends Model
{
    use HasFactory, SoftDeletes, \App\Models\Traits\Tenantable;

    protected $fillable = [
        'company_id',
        'id_empresa',      // mirror de company_id (compat app mobile)
        'nome_fantasia',
        'razao_social',
        'cnpj',
        'code',
        'codigo_obra',     // mirror de code (compat app mobile)
        'cep',
        'endereco',
        'numero',
        'complemento',
        'bairro',
        'cidade',
        'estado',
        'email',
        'celular',
        'status',
        'started_at',
        'ended_at',
    ];

    protected static function booted(): void
    {
        // Mantem code <-> codigo_obra e company_id <-> id_empresa em sync.
        static::saving(function (self $obra) {
            if ($obra->code && !$obra->codigo_obra)        $obra->codigo_obra = $obra->code;
            if ($obra->codigo_obra && !$obra->code)        $obra->code = $obra->codigo_obra;
            if ($obra->company_id && !$obra->id_empresa)   $obra->id_empresa = $obra->company_id;
            if ($obra->id_empresa && !$obra->company_id)   $obra->company_id = $obra->id_empresa;
        });
    }

    protected $casts = [
        'started_at' => 'date',
        'ended_at'   => 'date',
    ];

    public static array $statuses = [
        'Ativa'      => 'Ativa',
        'Concluida'  => 'Concluída',
        'Paralisada' => 'Paralisada',
        'Cancelada'  => 'Cancelada',
    ];

    public static array $statusColors = [
        'Ativa'      => 'bg-green-50 text-green-700',
        'Concluida'  => 'bg-blue-50 text-blue-700',
        'Paralisada' => 'bg-yellow-50 text-yellow-700',
        'Cancelada'  => 'bg-red-50 text-red-700',
    ];

    // public function company() provido pela trait Tenantable

    /** Usuários com acesso a esta obra */
    public function users()
    {
        return $this->belongsToMany(User::class, 'obra_user')
                    ->withPivot('role')
                    ->withTimestamps();
    }
}
