import { defineConfig } from 'vite';
import path from 'path';
import checker from 'vite-plugin-checker';
import dts from 'vite-plugin-dts';
import { viteStaticCopy } from 'vite-plugin-static-copy'

console.log("vite: process.env.HC_APP_PORT: ", process.env.HC_APP_PORT);
console.log("vite: process.env.HAPP_BUILD_MODE: ", process.env.HAPP_BUILD_MODE);
const HAPP_BUILD_MODE = process.env.HAPP_BUILD_MODE? process.env.HAPP_BUILD_MODE : "Release";


console.log("vite: process.env.APPLET_VIEW: ", process.env.APPLET_VIEW);
const APPLET_VIEW = process.env.APPLET_VIEW? process.env.APPLET_VIEW : "main";

const DIST_FOLDER = "dist"

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@vines/app': path.resolve(__dirname, '../webapp/src'),
      '@ddd-qc/files': path.resolve(__dirname, '../webcomponents/src')
    }
  },
  plugins: [
    checker({typescript: true}),
    dts(),
    viteStaticCopy({
      targets: [
        { src: "weave.config.json", dest: "./" },
        { src: "../assets/favicon.ico", dest: "./" },
        { src: "../assets/icon.png", dest: "./assets" },
        { src: "../assets/icon.png", dest: "./" },
        { src: "../assets/favicon.png", dest: "./assets" },
        { src: '../node_modules/@shoelace-style/shoelace/dist/assets', dest: "shoelace-assets" }
      ]
    }),
  ],
  define: {
    '__APP_VERSION__': JSON.stringify(process.env.npm_package_version),
    'process.env.HAPP_BUILD_MODE': JSON.stringify(HAPP_BUILD_MODE),
    'process.env.HAPP_ENV': JSON.stringify("Browser"),
    'process.env.APPLET_VIEW': JSON.stringify(APPLET_VIEW),
    "process.env.HC_APP_PORT": JSON.stringify(process.env.HC_APP_PORT),
    "process.env.HC_ADMIN_PORT": JSON.stringify(process.env.HC_ADMIN_PORT) || undefined,
    'process.env.NO_WE': JSON.stringify(process.env.NO_WE || false),
  },
  build: {
    emptyOutDir: true,
    outDir: DIST_FOLDER,
     /* rollupOptions: {
          output: {
              entryFileNames: "index.js",
              chunkFileNames: `assets/index-chunk.js`,
              assetFileNames: "assets[extname]",
          },
      }*/
  },
  server: {
    open: true,
    watch: {
      usePolling: true,
      interval: 1000 // Check for changes every second
    }
  }
});
