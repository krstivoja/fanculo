const esbuild = require("esbuild");
const { tailwindPlugin } = require("esbuild-plugin-tailwindcss");
const { livereloadPlugin } = require("@jgoz/esbuild-plugin-livereload");
const path = require('path');
const fs = require('fs');

const isWatch = process.argv.includes('--watch');
const isProduction = process.argv.includes('--production');

const config = {
    entryPoints: ["src/index.js"],
    bundle: true,
    outdir: "dist", // Changed to outdir to match PHP expectations
    entryNames: "[name]", // This will create index.js in dist/
    minify: isProduction,
    sourcemap: !isProduction,
    plugins: [
        tailwindPlugin({
            cssModules: {
                enabled: true,
                exclude: ['input.css']
            }
        }),
        ...(isWatch && !isProduction ? [
            livereloadPlugin({
                port: 35729,
                delay: 300
            })
        ] : [])
    ],
};

async function build() {
    try {
        // Ensure dist directory exists
        const distDir = path.join(__dirname, 'dist');
        if (!fs.existsSync(distDir)) {
            fs.mkdirSync(distDir, { recursive: true });
        }

        if (isWatch) {
            const context = await esbuild.context(config);
            await context.watch();

            // Create dev mode marker file for PHP to detect
            const devMarkerPath = path.join(__dirname, 'dist', '.dev-mode');
            fs.writeFileSync(devMarkerPath, 'dev');

            console.log("👀 Watching for changes...");
            console.log("🔄 Development mode active - livereload enabled on port 35729");

            // Clean up on exit
            process.on('SIGINT', () => {
                console.log('\n🛑 Stopping development server...');
                const devMarkerPath = path.join(__dirname, 'dist', '.dev-mode');
                if (fs.existsSync(devMarkerPath)) {
                    fs.unlinkSync(devMarkerPath);
                }
                process.exit(0);
            });
        } else {
            await esbuild.build(config);

            // Remove dev mode marker in production
            const devMarkerPath = path.join(__dirname, 'dist', '.dev-mode');
            if (fs.existsSync(devMarkerPath)) {
                fs.unlinkSync(devMarkerPath);
            }

            console.log("✅ Production build successful");
        }
    } catch (error) {
        console.error("❌ Error during build:", error);
        process.exit(1);
    }
}

build();