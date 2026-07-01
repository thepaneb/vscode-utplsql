# Política de Segurança

## Versões suportadas

Como extensão do VSCode, apenas a **versão mais recente publicada no Marketplace** recebe correções de segurança. Recomendamos sempre manter a extensão atualizada.

| Versão              | Suportada          |
| ------------------- | ------------------ |
| Última (Marketplace)| :white_check_mark: |
| Versões anteriores  | :x:                |

## Escopo

Esta política cobre vulnerabilidades na extensão **utPLSQL Test Runner** em si (código TypeScript, manifesto `package.json`, scripts empacotados). Não cobre:

- Vulnerabilidades no **utPLSQL-cli** ou no framework **utPLSQL (UT3)** — reporte-as diretamente no [repositório oficial do utPLSQL](https://github.com/utPLSQL/utPLSQL-cli).
- Vulnerabilidades no **VSCode** em si — reporte à Microsoft.
- Configurações inseguras do banco Oracle do próprio usuário (credenciais, permissões de rede, etc.), que estão fora do controle da extensão.

## Áreas de atenção específicas deste projeto

Como a extensão invoca processos externos (`java` ou o `launcher` do utPLSQL-cli) e lê configurações do usuário para montar linhas de comando, áreas particularmente sensíveis incluem:

- Construção de argumentos de linha de comando a partir de settings (`utplsql.*`) e possível **injeção de comando** em ambientes Windows (`cmd`) ou shells Unix.
- Armazenamento e uso de **credenciais de conexão com o Oracle** (usuário/senha) fornecidas nas configurações do workspace.
- Leitura de arquivos de configuração de workspace (`.vscode/settings.json`) potencialmente vindos de repositórios não confiáveis, e execução automática de comandos com base neles.
- Geração de relatórios de cobertura e escrita de arquivos no sistema.

Se você identificar um problema em qualquer uma dessas áreas, isso é considerado uma vulnerabilidade de segurança, mesmo que pareça um "bug" comum.

## Como reportar uma vulnerabilidade

**Não abra uma issue pública** para vulnerabilidades de segurança.

Em vez disso, reporte de forma privada:

- Preferencialmente, use a aba **[Security] Report a vulnerability** deste repositório no GitHub (Security Advisories), se disponível; ou
- Envie um e-mail para o mantenedor com os detalhes (veja o perfil [@thepaneb](https://github.com/thepaneb) para contato).

Ao reportar, inclua sempre que possível:

- Descrição da vulnerabilidade e impacto potencial
- Passos para reproduzir (configuração usada, sistema operacional, versão da extensão e do VSCode)
- Prova de conceito, se aplicável
- Se souber, uma sugestão de correção ou mitigação

## O que esperar

- **Confirmação de recebimento**: em até 5 dias úteis.
- **Avaliação inicial**: informaremos se o relato foi aceito como vulnerabilidade em até 10 dias úteis.
- **Correção**: para vulnerabilidades confirmadas, o objetivo é lançar uma correção no Marketplace o mais rápido possível, dependendo da severidade e complexidade.
- **Divulgação**: pedimos que você não divulgue publicamente o problema até que uma correção esteja disponível. Após o lançamento, podemos publicar um aviso de segurança (GitHub Security Advisory) com os créditos ao pesquisador, caso deseje.

## Boas práticas para usuários

Enquanto usa a extensão, recomendamos:

- Não abrir workspaces de origem desconhecida com configurações `utplsql.*` já definidas sem revisar o `.vscode/settings.json` antes.
- Evitar armazenar senhas do Oracle em texto plano em arquivos de configuração versionados; prefira variáveis de ambiente ou cofres de segredo quando possível.
- Manter o **utPLSQL-cli**, o **Java** e o **driver Oracle** atualizados, já que vulnerabilidades nessas dependências também afetam a superfície de ataque geral.

Obrigado por ajudar a manter o utPLSQL Test Runner seguro para todos! 🔒
