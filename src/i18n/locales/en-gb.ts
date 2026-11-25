// Catálogo i18n `en-gb`. PURO (sem 'vscode').
// Gerado por scripts/i18n-apply.cjs; paridade em i18n.test.ts.
import { en } from './en';
import type { Message } from './types';

export const enGb: Record<string, Message> = {
  ...en,
  'ext.export.reporterPlaceholder': 'Choose a database reporter to export',
  'ext.export.toOutput': 'Show in Output',
  'ext.export.toFile': 'Save to file…',
  'ext.export.noTargets': 'No suite/test selected to export.',
  'ext.export.saved': 'Reporter "{reporter}" output saved to {path}',
  'ext.export.failed': 'Export failed: {error}',
  'coverage.html.ready': 'Coverage HTML report ready: {path}',
  'coverage.html.open': 'Open in Browser',
  'coverage.html.saved': 'Coverage HTML report saved to {path}',
  'runner.htmlReporterMissing': 'ut_coverage_html_reporter not found; the HTML report was skipped.',
  'ext.wallet.title': 'utPLSQL — Wallet password',
  'ext.wallet.prompt': 'Oracle Cloud wallet password (leave empty to remove).',
  'ext.wallet.saved': 'Wallet password saved for profile "{name}".',
  'ext.wallet.cleared': 'Wallet password removed from profile "{name}".',
  'ext.wallet.noProfile':
    'No active connection profile. Activate a profile before setting the wallet password.',
  'nls.command.generateTestSuite': 'utPLSQL: Generate test suite…',
  'ext.scaffold.noSource': 'No source found. Open a .pks/.pkb file or provide a database object.',
  'ext.scaffold.objectPrompt': 'Production database object (e.g. APP.APP_PKG)',
  'ext.scaffold.overwrite': 'The file {file} already exists. Overwrite?',
  'ext.scaffold.overwriteButton': 'Overwrite',
  'ext.scaffold.created': 'Suite created at {path}',
  'ext.scaffold.failed': 'Failed to generate the suite: {error}',
  'nls.command.runRelated': 'utPLSQL: Run Related Tests',
  'ext.runRelated.noEditor': 'Open a production file to run the related tests.',
  'ext.runRelated.none': 'No suite related to {file} was found.',
};
