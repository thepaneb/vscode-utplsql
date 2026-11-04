#!/usr/bin/env node
const path = require('node:path');

let main;
try {
  ({ main } = require(path.join(__dirname, '..', 'out', 'tools', 'jevReview.js')));
} catch (error) {
  if (
    error &&
    error.code === 'MODULE_NOT_FOUND' &&
    String(error.message).includes('jevReview.js')
  ) {
    console.error("Execute 'npm run compile' antes de rodar o jev-review.");
    process.exit(2);
  }
  throw error;
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
