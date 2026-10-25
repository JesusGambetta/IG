import {defineConfig} from '@playwright/test';
const base=process.env.BASE_PATH||'/';
export default defineConfig({testDir:'./tests/browser',fullyParallel:true,use:{baseURL:process.env.PLAYWRIGHT_BASE_URL||`http://127.0.0.1:4173${base}`,browserName:'chromium',trace:'retain-on-failure'},webServer:process.env.PLAYWRIGHT_BASE_URL?undefined:{command:'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173 --strictPort',url:`http://127.0.0.1:4173${base}`,reuseExistingServer:false},reporter:'list'});
