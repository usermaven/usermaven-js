import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/index.ts'),
            name: 'UsermavenSDK',
            fileName: (format) => `usermaven-js-sdk.${format}.js`,
        },
        rollupOptions: {
            output: {
                globals: {
                    // Add any global variables here if needed
                },
            },
        },
    },
    test: {
        // Configure Vitest options here
        globals: true,
        environment: 'jsdom',
    },
});
