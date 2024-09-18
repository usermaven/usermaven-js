import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/index.ts'),
            name: 'Usermaven',
            fileName: (format) => `usermaven-js-sdk.${format}.js`,
            formats: ['es', 'umd'],
        },
        watch: {},
    },
    server: {
        open: '/examples/index.html',
    },
});
