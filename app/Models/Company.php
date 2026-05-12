<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Company extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'logo_path',
        'is_active',
        // Dados fiscais
        'nome_fantasia',
        'razao_social',
        'cnpj',
        // Endereço
        'cep',
        'endereco',
        'numero',
        'bairro',
        'cidade',
        'estado',
        // Contato
        'email',
        'celular',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function users()
    {
        return $this->belongsToMany(User::class)->withPivot('role');
    }

    public function obras()
    {
        return $this->hasMany(Obra::class);
    }

    public function posts()
    {
        return $this->belongsToMany(Post::class, 'company_post', 'company_id', 'post_id')
                    ->withTimestamps();
    }

    /** Nome de exibição: fantasia > name */
    public function getDisplayNameAttribute(): string
    {
        return $this->nome_fantasia ?: $this->name;
    }
}
