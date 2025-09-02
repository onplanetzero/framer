// jest.config.js
module.exports = {
    // ... other Jest configurations
    transform: {
        "^.+\\.(t|j)sx?$": ["@swc/jest"],
    },
    // If using ES modules in your tests:
    // extensionsToTreatAsEsm: ['.ts', '.tsx'],
};
