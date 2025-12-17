"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const setup_1 = require("../setup");
exports.default = async () => {
    console.log('Running global teardown...');
    try {
        await (0, setup_1.teardownTestEnvironment)();
    }
    catch (error) {
        console.error('Error in global teardown:', error);
    }
    setTimeout(() => {
        console.log('Forcing process exit...');
        process.exit(0);
    }, 1000);
};
//# sourceMappingURL=globalTeardown.js.map