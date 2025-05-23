import js from '@eslint/js'
import ts from 'typescript-eslint'
import svelte from 'eslint-plugin-svelte'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

/** @type {import('eslint').Linter.Config[]} */
export default [
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs['flat/recommended'],
	prettier,
	...svelte.configs['flat/prettier'],
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			},
		},
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser,
			},
		},
	},
	{
		ignores: ['build/', '.svelte-kit/', 'dist/'],
	},
	{
		rules: {
			'@typescript-eslint/naming-convention': [
				'error',
				{
					selector: 'variableLike',
					format: ['snake_case', 'UPPER_CASE', 'PascalCase'],
					leadingUnderscore: 'allow',
				},
				{
					selector: 'parameter',
					modifiers: ['destructured'],
					format: null,
				},
				{
					selector: 'variable',
					modifiers: ['destructured'],
					format: null,
				},
			],
			'@typescript-eslint/no-unused-expressions': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					caughtErrorsIgnorePattern: '^_',
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
				},
			],
			eqeqeq: ['error', 'always'],
			'svelte/button-has-type': 'error',
			'svelte/require-each-key': 'off', // Unnecessary each key probably has performance downside
		},
	},
]
