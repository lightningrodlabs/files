import { defineConfig } from 'vite';
import path from 'path';
import checker from 'vite-plugin-checker';
import topLevelAwait from "vite-plugin-top-level-await";
import { viteStaticCopy } from 'vite-plugin-static-copy'

console.log("vite: process.env.HC_APP_PORT: ", process.env.HC_APP_PORT);
console.log("vite: process.env.HAPP_BUILD_MODE: ", process.env.HAPP_BUILD_MODE);
const HAPP_BUILD_MODE = process.env.HAPP_BUILD_MODE? process.env.HAPP_BUILD_MODE : "Release";

console.log("vite: process.env.APPLET_VIEW: ", process.env.APPLET_VIEW);
const APPLET_VIEW = process.env.APPLET_VIEW? process.env.APPLET_VIEW : "main";

const DIST_FOLDER = "."

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@files/app': path.resolve(__dirname, '../webapp/src'),
      '@ddd-qc/files': path.resolve(__dirname, '../webcomponents/src')
    }
  },
  plugins: [
    checker({
      typescript: true,
    }),
    topLevelAwait({}),
    viteStaticCopy({
      targets: [
        { src: "../assets/favicon.ico", dest: DIST_FOLDER },
        { src: "../assets/icon.png", dest: DIST_FOLDER + "/assets" },
        { src: "../assets/icon.png", dest: DIST_FOLDER },
        { src: "../assets/favicon.png", dest: DIST_FOLDER + "/assets" },
        { src: "../node_modules/@shoelace-style/shoelace/dist/themes/light.css", dest: DIST_FOLDER, rename: "styles.css" },
        //{ src: '../node_modules/@shoelace-style/shoelace', dest: DIST_FOLDER }
        { src: '../node_modules/@shoelace-style/shoelace/dist/assets', dest: DIST_FOLDER }
      ]
    }),
  ],
  define: {
    '__APP_VERSION__': JSON.stringify(process.env.npm_package_version),
    'process.env.HAPP_BUILD_MODE': JSON.stringify(HAPP_BUILD_MODE),
    'process.env.HAPP_ENV': HAPP_BUILD_MODE == "Debug"? JSON.stringify("BrowserWe") : JSON.stringify("We"),
    'process.env.APPLET_VIEW': JSON.stringify(APPLET_VIEW),
    "process.env.HC_APP_PORT": JSON.stringify(process.env.HC_APP_PORT),
    "process.env.HC_ADMIN_PORT": JSON.stringify(process.env.HC_ADMIN_PORT) || undefined,
    'process.env.NO_WE': JSON.stringify(process.env.NO_WE || false),
  },
  server: {
    open: true, // This will open the browser automatically
    watch: {
      usePolling: true,
      interval: 1000 // Check for changes every second
    }
  }
});
