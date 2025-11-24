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
        host: '192.168.18.23', // Use specific IP instead of 0.0.0.0
        strictPort: true, // Don't try other ports if 3000 is busy
        cors: true, // Enable CORS for all origins
        origin: 'http://192.168.18.23:8000', // CORS origin
    },
    resolve: {
        alias: {
            '@': '/resources/js',
        },
    },
});
