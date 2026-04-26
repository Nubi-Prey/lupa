import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createServer, type ViteDevServer, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { chromium, type Page, type BrowserContext } from 'playwright'
import { mkdirSync } from 'fs'
import { services, customers, orders } from './demo-data.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = resolve(__dirname, '..', 'docs/screenshots')
const VIEWPORT = { width: 1280, height: 800 }
const PROJECT_ROOT = resolve(__dirname, '..')

function stripCsp(): Plugin {
  return {
    name: 'strip-csp',
    transformIndexHtml(html) {
      return html.replace(/<meta[^>]+http-equiv="Content-Security-Policy"[^>]*>/, '')
    }
  }
}

const ROUTES = [
  { path: '/', name: 'dashboard' },
  { path: '/os', name: 'service-orders' },
  { path: '/os/new', name: 'new-order' },
  { path: '/workshop', name: 'workshop' },
  { path: '/customers', name: 'customers' },
  { path: '/services', name: 'services' }
]

const DARK_ROUTES = [
  { path: '/', name: 'dashboard-dark' },
  { path: '/workshop', name: 'workshop-dark' },
  { path: '/os', name: 'service-orders-dark' }
]

const MOCK_API_SCRIPT = `
window.__LUPA_MOCK__ = ${JSON.stringify({ services, customers, orders })};
(function() {
  var data = window.__LUPA_MOCK__;
  var connInfo = { state:'connected', dbName:'lupa', host:'cluster0.mongodb.net', uri:'mongodb+srv://***:***@cluster0.mongodb.net/lupa' };
  window.api = {
    db: { connect:function(){return Promise.resolve(connInfo)}, disconnect:function(){return Promise.resolve({success:true})}, getState:function(){return Promise.resolve(connInfo)}, onStateChange:function(cb){cb('connected',connInfo);return function(){}} },
    services: { findAll:function(){return Promise.resolve(data.services)}, create:function(d){return Promise.resolve(Object.assign({id:'new-'+Date.now()},d))}, update:function(id,d){return Promise.resolve(Object.assign({id:id},d))}, delete:function(){return Promise.resolve({success:true})} },
    customers: { findAll:function(){return Promise.resolve(data.customers)}, create:function(d){return Promise.resolve(Object.assign({id:'new-'+Date.now()},d))}, update:function(id,d){return Promise.resolve(Object.assign({id:id},d))}, delete:function(){return Promise.resolve({success:true})} },
    orders: { findAll:function(){return Promise.resolve(data.orders)}, findById:function(id){return Promise.resolve(data.orders.find(function(o){return o.id===id})||data.orders[0])}, create:function(d){return Promise.resolve(Object.assign({id:'new-'+Date.now(),osNumber:999},d))}, update:function(id,d){return Promise.resolve(Object.assign({id:id},d))}, updateStatus:function(id,s){var o=data.orders.find(function(o){return o.id===id})||data.orders[0];return Promise.resolve(Object.assign({},o,{status:s}))}, delete:function(){return Promise.resolve({success:true})} },
    cache: { load:function(){return Promise.resolve({services:data.services,customers:data.customers,serviceOrders:data.orders,lastSync:new Date().toISOString()})} },
    config: { get:function(){return Promise.resolve({mongodbUri:'***',theme:'light'})}, set:function(k,v){if(k==='theme'){document.documentElement.classList.toggle('dark',v==='dark')}return Promise.resolve({mongodbUri:'***',theme:String(v||'light')})}, hasDbUri:function(){return Promise.resolve(true)}, onUriChange:function(){return function(){}} },
    openExternal: function(){return Promise.resolve()}
  };
  window.electron = {};
})();
`

async function startVite(): Promise<ViteDevServer> {
  const server = await createServer({
    root: resolve(PROJECT_ROOT, 'src/renderer'),
    resolve: {
      alias: {
        '@renderer': resolve(PROJECT_ROOT, 'src/renderer/src')
      }
    },
    plugins: [stripCsp(), react(), tailwindcss()],
    server: { port: 5173 },
    logLevel: 'warn'
  })
  await server.listen()
  return server
}

async function injectMock(context: BrowserContext, baseUrl: string): Promise<void> {
  await context.route(baseUrl + '/**', async (route) => {
    const url = route.request().url()
    if (url === baseUrl + '/' || url.endsWith('index.html')) {
      const response = await route.fetch()
      let html = await response.text()
      html = html.replace('<head>', '<head><script>' + MOCK_API_SCRIPT + '</script>')
      await route.fulfill({ response, body: html, contentType: 'text/html' })
    } else {
      await route.continue()
    }
  })
}

async function screenshot(
  page: Page,
  baseUrl: string,
  route: { path: string; name: string }
): Promise<void> {
  await page.goto(`${baseUrl}/#${route.path}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await page.screenshot({ path: resolve(OUTPUT_DIR, `${route.name}.png`) })
  console.log(`  ✓ ${route.name}`)
}

async function main(): Promise<void> {
  mkdirSync(OUTPUT_DIR, { recursive: true })

  console.log('Starting Vite dev server...')
  const server = await startVite()
  const address = server.resolvedUrls?.local?.[0] || 'http://localhost:5173'
  console.log(`Vite ready at ${address}`)

  console.log('Launching Chromium...')
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: VIEWPORT, locale: 'pt-BR' })

  await injectMock(context, address)

  // Light mode
  console.log('\nLight mode:')
  const lightPage = await context.newPage()
  lightPage.on('console', (msg) => {
    if (msg.type() === 'error') console.log('    [browser]', msg.text().slice(0, 120))
  })

  for (const route of ROUTES) {
    await screenshot(lightPage, address, route)
  }

  // Command bar
  console.log('\nSpecial:')
  await lightPage.goto(`${address}/#/`, { waitUntil: 'networkidle' })
  await lightPage.waitForTimeout(500)
  await lightPage.keyboard.press('Control+k')
  await lightPage.waitForTimeout(500)
  await lightPage.screenshot({ path: resolve(OUTPUT_DIR, 'command-bar.png') })
  console.log('  ✓ command-bar')

  // Service order detail
  await lightPage.goto(`${address}/#/os/os-1`, { waitUntil: 'networkidle' })
  await lightPage.waitForTimeout(800)
  await lightPage.screenshot({ path: resolve(OUTPUT_DIR, 'service-order-detail.png') })
  console.log('  ✓ service-order-detail')

  // Dark mode
  console.log('\nDark mode:')
  const darkContext = await browser.newContext({ viewport: VIEWPORT, locale: 'pt-BR' })
  await injectMock(darkContext, address)

  const darkPage = await darkContext.newPage()
  darkPage.on('console', (msg) => {
    if (msg.type() === 'error') console.log('    [browser]', msg.text().slice(0, 120))
  })

  for (const route of DARK_ROUTES) {
    await darkPage.goto(`${address}/#${route.path}`, { waitUntil: 'networkidle' })
    await darkPage.waitForTimeout(500)
    await darkPage.evaluate(() => {
      document.documentElement.classList.add('dark')
    })
    await darkPage.waitForTimeout(300)
    await darkPage.screenshot({ path: resolve(OUTPUT_DIR, `${route.name}.png`) })
    console.log(`  ✓ ${route.name}`)
  }

  await darkContext.close()

  await browser.close()
  await server.close()

  const total = ROUTES.length + DARK_ROUTES.length + 2
  console.log(`\nDone! ${total} screenshots saved to ${OUTPUT_DIR}/`)
}

main().catch((err) => {
  console.error('Screenshot generation failed:', err)
  process.exit(1)
})
