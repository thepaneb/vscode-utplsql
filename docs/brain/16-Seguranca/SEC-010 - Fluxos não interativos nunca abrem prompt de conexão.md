---
id: SEC-010
tipo: seguranca
titulo: Fluxos não interativos nunca abrem prompt de conexão
dominio: disponibilidade
status: ativo
severidade: media
verificado: 2026-09-23
implementacao: ["src/config.ts:171", "src/quickfix.ts:304"]
testes: ["src/test/unit/quickfixActivation.test.ts"]
regras: ["BR-CONN-001", "BR-UI-007"]
tags: ["seguranca", "disponibilidade"]
---
## Enunciado

Diagnósticos, validação de setup e ações rápidas usam resolveConnectionNoPrompt; o prompt só aparece em fluxo interativo de execução.

## Controle

resolveConnectionNoPrompt retorna undefined sem interagir; resolveConnection é usado apenas onde há intenção explícita do usuário.

## Justificativa

Evitar que validações automáticas (inclusive em CI/headless) travem esperando entrada do usuário.

