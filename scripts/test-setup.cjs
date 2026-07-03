// Setup para testes unitários: substitui o módulo 'vscode' por um stub.
const path = require('path');
const Module = require('module');
const origResolve = Module._resolveFilename;

const stubPath = path.resolve(__dirname, '..', 'out', 'test', 'vscode-stub.js');

Module._resolveFilename = function (request, parent) {
  if (request === 'vscode') return stubPath;
  return origResolve.call(this, request, parent);
};
