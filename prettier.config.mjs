/**
 * Prettier Configuration File
 *
 * This file configures the code formatting rules for this project.
 * Each option below is explained with comments to clarify its effect.
 *
 * For the complete list of Prettier options, visit:
 * https://prettier.io/docs/en/options.html
 */

/** @type {import("prettier").Config} */
const prettierConfig = {
  // Print semicolons at the ends of statements.
  semi: true,

  // Print trailing commas wherever possible in multi-line object, array, etc.
  // Pros: Cleaner git diffs; Cons: May not be preferred in all codebases.
  trailingComma: 'all',

  // Prefer single quotes for strings instead of double quotes.
  singleQuote: true,

  // Specify the line length where Prettier will try to wrap code.
  printWidth: 100,

  // Number of spaces per indentation level.
  tabWidth: 2,

  // Indent lines with tabs instead of spaces.
  useTabs: false,

  // Always include parentheses around a sole arrow function parameter.
  arrowParens: 'always',

  // Enforce LF (\n) for line endings, important for cross-platform consistency.
  endOfLine: 'lf',

  // Control whether Prettier formats embedded code (like in Markdown files).
  embeddedLanguageFormatting: 'auto',

  // Print spaces between brackets in object literals.
  bracketSpacing: true,

  // Format markdown text content (not just code blocks).
  proseWrap: 'always',

  // Plugins to extend Prettier functionality
  plugins: ['@ianvs/prettier-plugin-sort-imports'],
  importOrder: ['<THIRD_PARTY_MODULES>', '^@/', '^[./]'],
  importOrderParserPlugins: ['typescript', 'decorators-legacy'],
};

export default prettierConfig;
