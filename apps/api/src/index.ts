import { App } from './App.js';

// top-level await is now valid in ES2024 ESM
const app = new App();

(async function main() {
    const app = new App();
    try {
        await app.start();
    } catch (err) {
        app['server'].log.error(err);
        process.exit(1);
    }
})();