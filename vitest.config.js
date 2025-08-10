import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: ["./tests/setup.js"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: [
				"node_modules/",
				"dist/",
				"tests/",
				"examples/",
				"**/*.config.js",
				"**/*.d.ts"
			],
			thresholds: {
				global: {
					branches: 80,
					functions: 80,
					lines: 80,
					statements: 80
				}
			}
		}
	},
	resolve: {
		alias: {
			"@tumbati/bukajs": "./src/core/index.js"
		}
	}
});