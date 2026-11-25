<?php

// app/Models/Module.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Module extends Model
{
    use HasFactory;

    /**
     * Rotas que o sistema usa como destino padrão após o login e que, por isso,
     * não podem ser desativadas, renomeadas ou excluídas pelo cadastro de módulos.
     * O acesso continua exigindo permissão explícita por empresa.
     */
    public const ESSENTIAL_ROUTES = ['dashboard'];

    public function isEssential(): bool
    {
        return in_array($this->getOriginal('route_name'), self::ESSENTIAL_ROUTES, true);
    }

    protected $fillable = [
        'parent_id',                // se quiser manter
        'id_modulo_relacionamento', // pai no menu
        'name',
        'slug',
        'route_name',
        'icon',
        'url',
        'ordem',
        'is_active',
        'show_in_menu',
        'sort_order',
    ];

    // Permissões
    public function permissions()
    {
        return $this->hasMany(ModulePermission::class, 'module_id');
    }

    // Pai no menu
    public function parent()
    {
        return $this->belongsTo(Module::class, 'parent_id');
    }

    // Filhos no dropdown
    public function children()
    {
        return $this->hasMany(Module::class, 'parent_id');
    }

    // Escopos úteis
    public function scopeActive($query)
    {
        return $query->where('is_active', 1);
    }

    public function scopeShowInMenu($query)
    {
        return $query->where('show_in_menu', 1);
    }
}
