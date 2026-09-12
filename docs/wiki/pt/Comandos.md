# Comandos

Todos os comandos da extensão disponíveis na palette (`Ctrl+Shift+P`),
com prefixo `utPLSQL:`.

![Palette de comandos com prefixo utPLSQL](../images/palette-commands.png)

## Lista completa

| Comando | Descrição | Atalho via UI |
|---|---|---|
| `utPLSQL: Rodar todos os testes` | Executa todas as suites do workspace | Botão ▶ na view Testing |
| `utPLSQL: Rodar testes deste arquivo` | Executa suites do `.pks`/`.pkb` ativo | Clique direito → arquivo |
| `utPLSQL: Rodar testes deste arquivo com cobertura` | Idem, com perfil de cobertura | Clique direito → arquivo |
| `utPLSQL: Rodar testes desta pasta` | Executa suites da pasta selecionada | Clique direito → pasta |
| `utPLSQL: Rodar testes desta pasta com cobertura` | Idem, com perfil de cobertura | Clique direito → pasta |
| `utPLSQL: Atualizar testes` | Força rediscovery dos `.pks` | — |
| `utPLSQL: Cancelar execução` | Interrompe a execução em andamento | `Escape` |
| `utPLSQL: Mostrar informações do utPLSQL` | Versões API/DB | — |
| `utPLSQL: Selecionar reporter adicional...` | QuickPick com reporters do banco | — |
| `utPLSQL: Limpar conexão da sessão` | Remove conexão do cache | — |
| `utPLSQL: Rerun Last` | Repete a última execução | `Ctrl+Shift+U L` |
| `utPLSQL: Run Test at Cursor` | Executa o teste sob o cursor | `Ctrl+Shift+U U` |
| `utPLSQL: Run Failed Tests` | Reexecuta apenas testes falhos | `Ctrl+Shift+U X` |
| `utPLSQL: Mostrar Test Explorer` | Foca a view Testing | Clique na status bar |
| `utPLSQL: Validar configuração` | Roda validação completa do setup (inclui integridade da instalação UT3) | — |
| `utPLSQL: Configurar conexão` | Abre settings em `utplsql.connection` | — |
| `utPLSQL: Alternar perfil de conexão...` | QuickPick para trocar o perfil de conexão ativo | Clique na status bar |
| `utPLSQL: Novo perfil de conexão...` | Cria um novo perfil de conexão | — |
| `utPLSQL: Gerenciar perfis de conexão` | Abre os perfis de conexão salvos | — |
| `utPLSQL: Importar conexões do SQL Developer` | Importa conexões do SQL Developer como perfis | — |
| `utPLSQL: Depurar teste (PL/SQL)` | Inicia o debug de um teste via DBMS_DEBUG (Debug Adapter `utplsql`) | — |
| `utPLSQL: Executar script` | Executa o script aberto no editor contra um perfil (QuickPick de conexão) | Clique direito → arquivo `.sql`/`.pks`/`.pkb`/`.fnc`/`.prc`/`.trg` |
| `utPLSQL: Executar arquivo de script` | Executa um arquivo de script do Explorer (decodificado no `charset` do perfil) | Clique direito → arquivo |
| `utPLSQL: Executar pasta de scripts` | Executa os scripts da pasta em ordem alfabética (filtro `utplsql.scriptRunner.filePattern`) | Clique direito → pasta |
| `utPLSQL: Copiar grants de cobertura para clipboard` | Copia grants SQL para clipboard | — |
| `utPLSQL: Executar teste (CodeLens)` | Interno — disparado pelos botões de CodeLens | Botão ▶ sobre `%suite`/`%test` |

> **Recompilar UT3** não aparece na palette — é um quick-fix interno do
> diagnostic "utPLSQL Setup" (`UTPLSQL_INVALID_OBJECTS`).

## Menu de contexto

Os comandos de execução também aparecem no menu de contexto:

- **Clique direito num arquivo** `.pks`/`.pkb` → executa as suites daquele arquivo
- **Clique direito numa pasta** → executa as suites de todos os `.pks` dentro dela
- **Clique direito num arquivo** `.sql`/`.pks`/`.pkb`/`.fnc`/`.prc`/`.trg` → executa o script contra um perfil de conexão (saída no OutputChannel "utPLSQL Script")
- **Clique direito numa pasta** → executa os scripts da pasta em ordem alfabética

![Menu de contexto sobre uma pasta](../images/context-menu-folder.png)

## Atalhos de teclado

Todos os atalhos usam o prefixo `Ctrl+Shift+U` (`Cmd+Shift+U` no Mac):

| Atalho | Comando |
|---|---|
| `Ctrl+Shift+U R` | Rodar todos os testes |
| `Ctrl+Shift+U T` | Rodar testes do arquivo |
| `Ctrl+Shift+U Shift+T` | Rodar testes do arquivo com cobertura |
| `Ctrl+Shift+U F` | Atualizar testes (refresh) |
| `Ctrl+Shift+U I` | Mostrar informações do utPLSQL |
| `Ctrl+Shift+U C` | Limpar conexão da sessão |
| `Ctrl+Shift+U L` | Rerun last (último teste) |
| `Ctrl+Shift+U U` | Run at cursor (teste sob cursor) |
| `Ctrl+Shift+U X` | Run failed only (apenas falhas) |
| `Escape` | Cancelar execução |

Para redefinir, vá em File → Preferences → Keyboard Shortcuts e busque `utplsql`.

![Atalhos de teclado filtrados por utplsql](../images/keyboard-shortcuts.png)
