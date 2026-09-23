## Descrição

<!-- Explique o que este PR faz e por quê. Se corrige um bug, descreva o comportamento anterior. -->

Closes #<!-- número da issue, se aplicável -->

## Tipo de mudança

- [ ] 🐛 Correção de bug
- [ ] ✨ Nova funcionalidade
- [ ] 💥 Breaking change (mudança que quebra compatibilidade com configurações/comandos existentes)
- [ ] 📝 Documentação (README, CONTRIBUTING, etc.)
- [ ] ♻️ Refatoração (sem mudança de comportamento)
- [ ] 🧪 Testes

## Como foi testado?

<!-- Descreva o ambiente e os passos usados para validar a mudança -->

- **VSCode**: <!-- versão -->
- **SO**: <!-- Windows / Linux / macOS -->
- **Conexão**: <!-- Oracle direto (thin) / thick (Instant Client) -->
- **Banco Oracle / UT3**: <!-- versão, se relevante para o teste -->

Passos realizados:

1. ...
2. ...

## Checklist

- [ ] `npm run compile` executa sem erros
- [ ] `npm test` passa localmente
- [ ] Testei manualmente no Extension Development Host (`F5`)
- [ ] Se mexi em documentação/PRDs: editei a **nota do vault** (`docs/brain/`) e
      rodei `npm run brain:build` (não edite os arquivos gerados)
- [ ] Se mexi em `docs/brain/`: `npm run brain:ci` + `git diff --exit-code` limpos
- [ ] Atualizei o `CHANGELOG.md`
- [ ] Se alterei settings em `package.json`, mantive as descrições em português, no padrão do projeto
- [ ] Se alterei a montagem de SQL/PL-SQL, revisei possíveis impactos de injeção (binds)

## Screenshots (se aplicável)

<!-- Especialmente útil para mudanças em Test Explorer, gutters de cobertura ou UI em geral -->

## Notas adicionais

<!-- Qualquer contexto extra para quem for revisar -->
