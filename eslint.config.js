import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

const domainRestrictions = [
  { name: 'react', message: 'Domain code must remain framework-free.' },
  { name: 'react-dom', message: 'Domain code must remain framework-free.' },
  { name: 'react-dom/client', message: 'Domain code must remain framework-free.' },
  { name: 'react-router-dom', message: 'Domain code must remain framework-free.' },
]

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: ['src/domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: domainRestrictions,
        patterns: [
          { group: ['react/*', 'react-dom/*'], message: 'Domain code must remain framework-free.' },
          { group: ['**/components/**', '**/features/**', '@/components/**', '@/features/**'], message: 'Domain code cannot depend on UI layers.' },
          { group: ['**/*.css'], message: 'Domain code cannot depend on browser-only modules.' },
        ],
      }],
    },
  },
)
