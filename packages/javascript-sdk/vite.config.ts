import { defineConfig } from 'vite';
import path from 'path';
import { resolve } from 'path'


export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'Usermaven',
            formats: ['es', 'umd'],
            fileName: (format) => `usermaven-js-sdk.${format}.js`,
        },
        watch: {},
        rollupOptions: {
            external: [],  // Add external dependencies here if needed
            output: {
                globals: {
                    // Define any global dependencies here
                },
            },
        },
    },
    server: {
        open: '/examples/index.html',
    },
});
