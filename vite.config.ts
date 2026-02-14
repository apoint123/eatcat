import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
	server: {
		port: 18801,
		strictPort: true,
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
