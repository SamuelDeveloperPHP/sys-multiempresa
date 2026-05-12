<?php

// app/Models/Traits/Auditable.php

namespace App\Models\Traits;

use Illuminate\Database\Eloquent\Model;

trait Auditable
{
    public static function bootAuditable()
    {
        static::created(function (Model $model) {
            log_activity('create', [
                'module' => static::guessModuleSlug(),
                'after'  => $model->getAttributes(),
            ], $model);
        });

        static::updated(function (Model $model) {
            $before = [];
            foreach ($model->getChanges() as $field => $newValue) {
                $before[$field] = $model->getOriginal($field);
            }

            log_activity('update', [
                'module' => static::guessModuleSlug(),
                'before' => $before,
                'after'  => $model->getChanges(),
            ], $model);
        });

        static::deleted(function (Model $model) {
            log_activity('delete', [
                'module' => static::guessModuleSlug(),
                'before' => $model->getOriginal(),
            ], $model);
        });
    }

    protected static function guessModuleSlug(): ?string
    {
        // aqui você pode mapear pela convenção
        // ex: Post -> blog-posts, Company -> companies...
        $map = [
            \App\Models\Post::class      => 'blog-posts',
            \App\Models\Category::class  => 'blog-categories',
            \App\Models\Tag::class       => 'blog-tags',
            \App\Models\Company::class   => 'companies',
            \App\Models\User::class      => 'users',
            \App\Models\Module::class    => 'modules',
            \App\Models\ActivityLog::class => 'activity-logs',
            
            // ...
        ];

        $class = static::class;
        return $map[$class] ?? null;
    }
}
