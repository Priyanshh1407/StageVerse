import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
    resolve: {
        alias: { '@': path.resolve(import.meta.dirname) },
    },
    test: {
        environment: 'node',
        globalSetup: ['./tests/globalSetup.js'],
        setupFiles: ['./tests/setup.js'],
        include: ['tests/**/*.test.js'],
        // One in-memory replica set is shared, so test files run one at a time
        fileParallelism: false,
        testTimeout: 20000,
        hookTimeout: 120000,
    },
});
