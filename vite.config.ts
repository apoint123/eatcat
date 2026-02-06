import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
	plugins: [
		viteStaticCopy({
			targets: [
				{
					src: "static/image",
					dest: "static",
				},
				{
					src: "static/music",
					dest: "static",
				},
			],
		}),
	],
	base: "./",
	build: {
		outDir: "dist",
		assetsDir: "assets",
	},
});
