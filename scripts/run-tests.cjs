const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const unitTestDir = path.join(__dirname, '..', 'out', 'test', 'unit');

if (!fs.existsSync(unitTestDir)) {
  console.error(`Diretório de testes não encontrado: ${unitTestDir}. Execute 'npm run compile' primeiro.`);
  process.exit(1);
}

// Encontra recursivamente todos os arquivos .test.js
function findTestFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of list) {
    const res = path.resolve(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(findTestFiles(res));
    } else if (entry.isFile() && entry.name.endsWith('.test.js')) {
      results.push(res);
    }
  }
  return results;
}

const testFiles = findTestFiles(unitTestDir);

if (testFiles.length === 0) {
  console.error(`Nenhum arquivo de teste encontrado em: ${unitTestDir}`);
  process.exit(1);
}

const setupPath = path.join(__dirname, 'test-setup.cjs');
const res = spawnSync('node', ['--require', setupPath, '--test', ...testFiles], { stdio: 'inherit' });
process.exit(res.status ?? 0);
