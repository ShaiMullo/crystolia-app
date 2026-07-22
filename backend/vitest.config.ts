import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['src/**/*.test.ts'],
        setupFiles: ['src/test/setup.ts'],
        // Route/model modules share a single mongoose connection per worker;
        // run test files sequentially against one in-memory mongod.
        fileParallelism: false,
        hookTimeout: 120_000, // first run downloads the mongod binary
        testTimeout: 30_000,
    },
});
