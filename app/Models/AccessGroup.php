<?php

namespace App\Models;

use App\Models\Traits\Tenantable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Grupo de acesso (nível de acesso) reutilizável POR EMPRESA.
 *
 * É a BASE das permissões: o usuário herda as permissões do seu grupo naquela
 * empresa, a menos que exista um override em module_permissions para o módulo
 * (nesse caso o override vence por inteiro). Ver App\Services\EffectivePermissions.
 *
 * Isolamento multiempresa garantido pela trait Tenantable (CompanyScope global +
 * preenchimento automático de company_id na criação).
 */
class AccessGroup extends Model
{
    use HasFactory, Tenantable;

    protected $fillable = [
        'company_id',
        'name',
        'descricao',
        'todas_obras',
    ];

    protected $casts = [
        'todas_obras' => 'boolean',
    ];

    /** Linhas de permissão (uma por módulo) deste grupo. */
    public function permissions()
    {
        return $this->hasMany(AccessGroupPermission::class, 'access_group_id');
    }

    /**
     * Obras liberadas para este grupo (pivot access_group_obra).
     *
     * ATENÇÃO: isso SOMA com as obras do vínculo direto do usuário
     * (obra_user) — é UNIÃO, não override. Ignorado quando todas_obras = true.
     * Fonte única do cálculo: App\Services\ObraAccess.
     */
    public function obras()
    {
        return $this->belongsToMany(Obra::class, 'access_group_obra', 'access_group_id', 'obra_id')
                    ->withTimestamps();
    }

    /**
     * Usuários que pertencem a este grupo (via pivot company_user).
     * O company_id do pivot casa naturalmente com o company_id do grupo,
     * pois o grupo é por-empresa.
     */
    public function users()
    {
        return $this->belongsToMany(User::class, 'company_user', 'access_group_id', 'user_id')
                    ->withPivot('company_id', 'role', 'todas_obras');
    }

    // company() é provido pela trait Tenantable.
}
