import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'Usermaven',
            formats: ['es', 'cjs', 'umd'],
            fileName: (format) => {
                if (format === 'umd') {
                    return 'lib.js';
                }
                return `usermaven.${format}.js`;
            },
        },
        rollupOptions: {
            external: [],  // Add external dependencies here if needed
            output: {
                globals: {
                    module: 'module',
                },
            },
        },
    },
    server: {
        open: '/examples/index.html',
        watch: {
            usePolling: true,
            ignored: ['!**/dist/**']
        },
    },
    optimizeDeps: {
        exclude: ['@usermaven/sdk-js'],
    },
});
