import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/js/index.css', 'resources/js/app.jsx'],
            refresh: true,
            // Force use IP address instead of 0.0.0.0
            valetTls: null,
        }),
        tailwindcss(),
    ],
    server: {
        port: 3000,
        host: 'localhost',
        strictPort: true,
        cors: true,
        origin: 'http://localhost:8000',
    },
    resolve: {
        alias: {
            '@': '/resources/js',
        },
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './resources/js/setupTests.js',
        css: true,
    },
});
