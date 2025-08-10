export default {
	env: {
		browser: true,
		es2021: true,
		node: true,
		jest: true
	},
	extends: [
		"eslint:recommended",
		"@typescript-eslint/recommended",
		"prettier"
	],
	parser: "@typescript-eslint/parser",
	parserOptions: {
		ecmaVersion: "latest",
		sourceType: "module"
	},
	plugins: [
		"@typescript-eslint",
		"prettier"
	],
	rules: {
		"quotes": ["error", "double"],
		"indent": ["error", "tab", { "SwitchCase": 1 }],
		"semi": ["error", "always"],
		"comma-dangle": ["error", "never"],
		"no-trailing-spaces": "error",
		"eol-last": ["error", "always"],
		"object-curly-spacing": ["error", "always"],
		"array-bracket-spacing": ["error", "never"],
		"space-before-blocks": "error",
		"keyword-spacing": "error",
		"space-infix-ops": "error",
		"comma-spacing": ["error", { "before": false, "after": true }],
		"brace-style": ["error", "1tbs", { "allowSingleLine": true }],
		"no-multiple-empty-lines": ["error", { "max": 2, "maxEOF": 1 }],
		"prefer-const": "error",
		"no-var": "error",
		"no-unused-vars": "off",
		"@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
		"@typescript-eslint/no-explicit-any": "warn",
		"@typescript-eslint/explicit-function-return-type": "off",
		"@typescript-eslint/explicit-module-boundary-types": "off",
		"@typescript-eslint/no-non-null-assertion": "warn",
		"no-console": "warn",
		"no-debugger": "error",
		"eqeqeq": ["error", "always"],
		"no-eval": "error",
		"no-implied-eval": "error",
		"prettier/prettier": "error"
	},
	ignorePatterns: [
		"dist/",
		"node_modules/",
		"coverage/",
		"*.config.js",
		"rollup.config.js"
	],
	globals: {
		window: "readonly",
		document: "readonly",
		console: "readonly",
		pdfjsLib: "readonly",
		mammoth: "readonly",
		XLSX: "readonly",
		localforage: "readonly"
	}
};