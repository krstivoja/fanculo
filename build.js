const esbuild = require("esbuild");
const { tailwindPlugin } = require("esbuild-plugin-tailwindcss");

const isWatch = process.argv.includes('--watch');
const isProduction = process.argv.includes('--production');

const config = {
    entryPoints: ["src/index.js"],
    bundle: true,
    outfile: "dist/index.min.js",
    minify: isProduction,
    sourcemap: !isProduction,
    plugins: [
        tailwindPlugin({
            cssModules: {
                enabled: true,
                exclude: ['input.css']
            }
        }),
    ],
};

async function build() {
    try {
        if (isWatch) {
            const context = await esbuild.context(config);
            await context.watch();
            console.log("👀 Watching for changes...");
        } else {
            await esbuild.build(config);
            console.log("✅ Build successful");
        }
    } catch (error) {
        console.error("❌ Error during build:", error);
        process.exit(1);
    }
}

build();