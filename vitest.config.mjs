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
        // Benchmarks only run with BENCH=1 (npm run bench), never in the normal test run
        include: process.env.BENCH ? ['bench/**/*.bench.js'] : ['tests/**/*.test.js'],
        // One in-memory replica set is shared, so test files run one at a time
        fileParallelism: false,
        testTimeout: 20000,
        hookTimeout: 120000,
        coverage: {
            provider: 'v8',
            // Server-side code is what the tests exercise; UI components are verified by hand
            include: ['lib/**/*.js', 'app/api/**/*.js', 'pages/api/**/*.js'],
            reporter: ['text-summary', 'text', 'html'],
        },
    },
});
