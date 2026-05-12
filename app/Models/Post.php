<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Post extends Model
{
    use HasFactory;

    protected $table = 'posts';

    protected $fillable = [
        'user_id',
        'category_id',
        'company_id',
        'companies',
        'title',
        'slug',
        'description',
        'content',
        'is_published',
        'published_at',
    ];

    protected $casts = [
        'is_published' => 'boolean',
        'published_at' => 'datetime',
    ];

    /*
    |--------------------------------------------------------------------------
    | RELACIONAMENTOS
    |--------------------------------------------------------------------------
    */

    public function author()
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function companies()
    {
        return $this->belongsToMany(Company::class, 'company_post', 'post_id', 'company_id')->withTimestamps();
    }

    public function company()
    {
        return $this->belongsToMany(Company::class, 'company_post', 'post_id', 'company_id')->withTimestamps();
    }

    public function tags()
    {
        return $this->belongsToMany(Tag::class, 'post_tag', 'post_id', 'tag_id')->withTimestamps();
    }

    public function images()
    {
        return $this->hasMany(PostImage::class)->orderBy('sort_order')->orderBy('id');
    }

    public function coverImage()
    {
        return $this->hasOne(PostImage::class)->where('is_cover', true);
    }

    /*
    |--------------------------------------------------------------------------
    | SCOPES
    |--------------------------------------------------------------------------
    */

    public function scopePublished($query)
    {
        return $query->where('is_published', true)
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now());
    }

    public function scopeForCompany($query, ?int $companyId)
    {
        if ($companyId) {
            $query->whereHas('companies', function ($q) use ($companyId) {
                $q->where('companies.id', $companyId);
            });
        }

        return $query;
    }

    /*
    |--------------------------------------------------------------------------
    | SLUG AUTOMÁTICO
    |--------------------------------------------------------------------------
    */

    protected static function booted()
    {
        static::addGlobalScope(new \App\Models\Scopes\PostCompanyScope);

        static::creating(function (Post $post) {
            if (empty($post->slug)) {
                $post->slug = Str::slug($post->title) . '-' . Str::random(5);
            }
        });

        static::updating(function (Post $post) {
            if ($post->isDirty('title') && empty($post->slug)) {
                $post->slug = Str::slug($post->title) . '-' . Str::random(5);
            }
        });
    }
}
