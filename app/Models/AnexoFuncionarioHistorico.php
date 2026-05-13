<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AnexoFuncionarioHistorico extends Model
{
    use SoftDeletes, HasFactory;

    protected $table = "anexos_funcionarios_historico";

    protected $fillable = [
        'id_anexo',
        'id_funcionario',
        'id_qualificacao',
        'id_obra',
        'historico',
        'user_create',
        'user_edit'
    ];

    public function anexo()
    {
        return $this->belongsTo(AnexoFuncionario::class, 'id_anexo');
    }

    public function obra()
    {
        return $this->belongsTo(Obra::class, 'id_obra');
    }
}
