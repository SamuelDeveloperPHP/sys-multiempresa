import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.jsx',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['Figtree', ...defaultTheme.fontFamily.sans],
            },
            // Paleta inspirada no Rise CRM (azul corporativo + grafite)
            colors: {
                // Azul Rise (#557bbb) como escala
                rise: {
                    50:  '#eef2f9',
                    100: '#dde6f3',
                    200: '#bccae7',
                    300: '#9aaedb',
                    400: '#7892cf',
                    500: '#557bbb',
                    600: '#4366a8',
                    700: '#3a5a8c',
                    800: '#2e4577',
                    900: '#1d2632', // mesmo grafite da sidebar
                },
                // alias semântico (primary aponta pra Rise)
                primary: {
                    50:  '#eef2f9',
                    100: '#dde6f3',
                    200: '#bccae7',
                    300: '#9aaedb',
                    400: '#7892cf',
                    500: '#557bbb',
                    600: '#4366a8',
                    700: '#3a5a8c',
                    800: '#2e4577',
                    900: '#1d2632',
                    DEFAULT: '#557bbb',
                },
            },
        },
    },

    plugins: [forms],
};
