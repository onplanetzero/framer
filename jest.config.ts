import type { Config } from 'jest';

const config: Config = {
    verbose: true,
    transform: {
        "^.+\\.(t|j)sx?$": "@swc/jest"
    },
    transformIgnorePatterns: ['/node_modules/'],
    testEnvironment: 'node'
};

export default config;
