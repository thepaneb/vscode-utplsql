# AI usage

This page describes how AI is used in **utPLSQL Test Runner**. It is a
disclosure, not a claim that the extension is an AI product.

## Runtime

The extension **does not call an LLM or any AI service** and **does not send
telemetry**. Test discovery, execution, coverage, diagnostics and debugging run
locally and talk only to the Oracle database configured by the user.

## Development and review

Maintainers and contributors may use AI coding assistants for drafts, tests,
documentation and review. The rules are:

- **Human review.** Every AI-assisted change is reviewed and tested by a human
  who can explain it. The human who signs the commit is responsible for
  correctness, licensing, security and tests.
- **Disclose.** Mention the tool and scope in the pull request for substantial
  assistance; commits may carry an `Assisted-by: <tool>/<model>` trailer.
  Autocomplete, spelling fixes and mechanical transforms do not need a
  dedicated disclosure.
- **No secrets.** Do not paste Oracle credentials, `.env` content, tokens,
  private keys, customer data or private URLs into a prompt. The Jev redaction
  is best-effort, not a guarantee.
- **Same gates.** AI-assisted changes pass the same CI, CodeQL, tests, lint and
  review gates as any other change.
- **Advisory review.** The Jev review (`npm run jev:review`) is a probabilistic
  signal over a filtered diff. It is not a human approval and never replaces
  tests, lint or review.

The full contribution policy is in
[CONTRIBUTING.md](CONTRIBUTING.md#ai-assisted-contributions). The data flow and
security posture of the Jev review are in [SECURITY.md](SECURITY.md#ai-assisted-development-and-jev-review).

## Promotion

Release notes and social posts may be AI-assisted and are reviewed by the
maintainer before publication. Platform AI labels are used where they exist; a
short "AI-assisted" note is added when the platform has no label.
