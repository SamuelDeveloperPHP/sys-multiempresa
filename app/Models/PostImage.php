<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PostImage extends Model
{
    use HasFactory;

    protected $fillable = [
        'post_id',
        'path',
        'original_name',
        'size',
        'sort_order',
    ];

    public function post()
    {
        return $this->belongsTo(Post::class);
    }

    public function getUrlAttribute(): string
    {
        // usa disco "public"
        return asset('storage/' . $this->path);
    }
}
