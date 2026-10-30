// NUEVO: verificación del frontend en pestañas reales mediante Chrome DevTools Protocol.
// Requiere Vite :5173, Chrome de pruebas :9223 y el servidor en memoria :3001.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const APP = 'http://localhost:5173';
const MEMORY = 'http://127.0.0.1:3001';
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const artifacts = path.join(os.tmpdir(), 'websocket-ui-review');
fs.mkdirSync(artifacts, { recursive: true });

async function connect(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
  let sequence = 0;
  const pending = new Map();
  const listeners = new Map();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const request = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) request.reject(new Error(JSON.stringify(message.error)));
      else request.resolve(message.result);
    } else {
      for (const listener of listeners.get(message.method) || []) listener(message.params);
    }
  });
  return {
    call(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = ++sequence;
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    on(method, listener) { listeners.set(method, [...(listeners.get(method) || []), listener]); },
    close() { socket.close(); },
  };
}

const browserInfo = await (await fetch('http://127.0.0.1:9223/json/version')).json();
const browser = await connect(browserInfo.webSocketDebuggerUrl);
const pages = [];
const exceptions = [];

async function newPage(route) {
  const { targetId } = await browser.call('Target.createTarget', { url: 'about:blank' });
  const target = (await (await fetch('http://127.0.0.1:9223/json/list')).json()).find((item) => item.id === targetId);
  const connection = await connect(target.webSocketDebuggerUrl);
  const page = { ...connection, targetId, requests: [], failNextStock: false };
  pages.push(page);
  page.on('Runtime.exceptionThrown', (event) => exceptions.push(event));
  page.on('Fetch.requestPaused', async ({ requestId, request }) => {
    const url = new URL(request.url);
    page.requests.push({ method: request.method, path: url.pathname });
    if (page.failNextStock && request.method === 'PATCH' && url.pathname.startsWith('/api/inventario/')) {
      page.failNextStock = false;
      await page.call('Fetch.fulfillRequest', { requestId, responseCode: 503, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' }], body: Buffer.from(JSON.stringify({ mensaje: 'Error simulado de guardado' })).toString('base64') });
    } else {
      // Solo las pestañas de prueba redirigen API y Socket.IO al servidor aislado.
      await page.call('Fetch.continueRequest', { requestId, url: MEMORY + url.pathname + url.search });
    }
  });
  await page.call('Runtime.enable');
  await page.call('Page.enable');
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await page.call('Fetch.enable', { patterns: [{ urlPattern: 'http://localhost:3000/*' }] });
  await page.call('Page.addScriptToEvaluateOnNewDocument', { source: `window.WebSocket = class extends window.WebSocket { constructor(url, protocols) { super(String(url).replace('localhost:3000', '127.0.0.1:3001'), protocols); } };` });
  page.evaluate = async (expression) => {
    const result = await page.call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  page.wait = async (expression) => {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await page.evaluate(`Boolean(${expression})`)) return;
      await pause(100);
    }
    throw new Error(`Tiempo agotado: ${expression}`);
  };
  page.click = async (selector) => { await page.evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`); await pause(80); };
  page.input = async (selector, value) => {
    await page.evaluate(`(()=>{const input=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await pause(60);
  };
  page.navigate = (nextRoute) => page.call('Page.navigate', { url: APP + nextRoute });
  page.shot = async (name) => { await page.call('Page.bringToFront'); const result = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); fs.writeFileSync(path.join(artifacts, name + '.png'), Buffer.from(result.data, 'base64')); };
  await page.navigate(route);
  return page;
}

async function request(route, method = 'GET', data) {
  const response = await fetch(MEMORY + '/api' + route, { method, headers: { 'Content-Type': 'application/json' }, ...(data ? { body: JSON.stringify(data) } : {}) });
  assert.ok(response.ok, `HTTP ${response.status} ${route}`);
  return response.json();
}
const pass = (message) => console.log('PASS ' + message);
const stockIs = (stock) => `document.querySelector('.admin-panel__stock strong')?.textContent==='${stock}'`;

try {
  // Restablece únicamente el servidor en memoria. Nunca utiliza el backend real :3000.
  await request('/inventario/variante/1', 'PATCH', { stock: 8 });
  const adminA = await newPage('/admin');
  const adminB = await newPage('/admin');
  const customer = await newPage('/');
  const stranger = await newPage('/seguimiento/1');
  for (const page of [adminA, adminB]) await page.wait(stockIs(8) + " && document.querySelector('.admin-panel__connection--online')");
  await customer.wait("document.querySelector('.fashion-card .fashion-btn-primary:not(:disabled)')");
  assert.equal(await adminA.evaluate("document.querySelectorAll('.admin-panel__stock-alert').length"), 0);
  pass('carga inicial sin alertas repetidas; dos administradores conectados');

  const beforeInvalid = adminA.requests.filter((item) => item.method === 'PATCH').length;
  for (const value of ['-1', '1.5', '']) {
    await adminA.input('#stock-1', value);
    await adminA.click('.admin-panel__stock-controls button');
    await adminA.wait("document.querySelector('.admin-panel__stock-feedback.is-error')");
  }
  assert.equal(adminA.requests.filter((item) => item.method === 'PATCH').length, beforeInvalid);
  pass('validación de stock: negativos, decimales y vacío no envían PATCH');

  await adminA.input('#stock-1', '4');
  await adminA.click('.admin-panel__stock-controls button');
  for (const page of [adminA, adminB]) await page.wait(stockIs(4) + " && document.querySelector('.admin-panel__stock-alert')?.textContent.includes('Stock bajo')");
  await customer.wait("document.querySelector('.fashion-card-availability')?.textContent.includes('4 disponibles')");
  pass('PATCH desde el panel sincroniza stock 4 en ambas pestañas y catálogo');
  await request('/inventario/variante/1', 'PATCH', { stock: 4 });
  await pause(350);
  assert.equal(await adminA.evaluate("document.querySelectorAll('.admin-panel__stock-alert').length"), 1);
  pass('inventory:update repetido no duplica la alerta');
  await adminB.call('Page.reload');
  await adminB.wait(stockIs(4) + " && document.querySelector('.admin-panel__stock--low') && document.querySelector('.admin-panel__connection--online')");
  assert.equal(await adminB.evaluate("document.querySelectorAll('.admin-panel__stock-alert').length"), 0);
  await adminA.click('.admin-panel__stock-alerts-heading button');
  await request('/inventario/variante/1', 'PATCH', { stock: 4 });
  await pause(250);
  assert.equal(await adminA.evaluate("document.querySelectorAll('.admin-panel__stock-alert').length"), 0);
  pass('carga inicial con stock bajo y avisos descartados no se repiten sin cambios');

  await request('/inventario/variante/1', 'PATCH', { stock: 0 });
  for (const page of [adminA, adminB]) await page.wait(stockIs(0) + " && document.querySelector('.admin-panel__stock-alert')?.textContent.includes('Agotado')");
  await customer.wait("document.querySelector('.fashion-card .fashion-btn-primary').disabled");
  await adminA.shot('admin-stock-agotado');
  pass('stock cero genera aviso de agotado y deshabilita agregar en el catálogo');
  await adminB.input('#stock-1', '8');
  await adminB.click('.admin-panel__stock-controls button');
  for (const page of [adminA, adminB]) await page.wait(stockIs(8));
  await customer.wait("!document.querySelector('.fashion-card .fashion-btn-primary').disabled");

  adminA.failNextStock = true;
  await adminA.input('#stock-1', '6');
  await adminA.click('.admin-panel__stock-controls button');
  await adminA.wait("document.querySelector('.admin-panel__stock-feedback.is-error')?.textContent.includes('Error simulado')");
  assert.equal((await request('/inventario'))[0].stock, 8);
  pass('fallo de guardado conserva existencias y muestra error por variante');

  await customer.click('.fashion-card .fashion-btn-primary');
  await customer.click('.fashion-bag');
  await customer.wait("document.querySelector('#nombre-cliente-input')");
  await customer.input('#nombre-cliente-input', 'Cliente de prueba en memoria');
  await customer.click('.fashion-cart-submit');
  await customer.wait("document.querySelector('.fashion-order-tracking-link')");
  for (const page of [adminA, adminB]) await page.wait("document.querySelector('.admin-panel__notification-copy')?.textContent.includes('Nuevo pedido')");
  const orderId = await customer.evaluate("JSON.parse(sessionStorage.getItem('tienda.ultimo-pedido')).id");
  assert.deepEqual(await customer.evaluate("Object.keys(JSON.parse(sessionStorage.getItem('tienda.ultimo-pedido')))"), ['id']);
  await customer.click('.fashion-order-tracking-link');
  await customer.wait("document.querySelector('.fashion-tracking-current h2')?.textContent==='Recibido'");
  pass('compra conserva order:new en ambas pestañas y habilita el seguimiento propio');

  await adminA.evaluate("const select=document.querySelector('.admin-panel__select');select.value='preparando';select.dispatchEvent(new Event('change',{bubbles:true}));");
  await customer.wait("document.querySelector('.fashion-tracking-current h2')?.textContent==='En preparación'");
  await customer.shot('seguimiento-preparando');
  for (const [estado, label] of [['enviado', 'Enviado'], ['entregado', 'Entregado'], ['cancelado', 'Pedido cancelado']]) {
    await request('/pedidos/' + orderId + '/estado', 'PATCH', { estado });
    await customer.wait(`document.querySelector('.fashion-tracking-current h2')?.textContent===${JSON.stringify(label)}`);
  }
  assert.equal(await customer.evaluate("document.querySelectorAll('.fashion-tracking-steps').length"), 0);
  pass('seguimiento recibe preparando, enviado, entregado y cancelado sin recargar');

  await stranger.wait("document.body.innerText.includes('no está disponible en esta pestaña')");
  assert.equal(stranger.requests.filter((item) => item.path.startsWith('/api/pedidos')).length, 0);
  const other = await request('/pedidos', 'POST', { nombre_cliente: 'Otro cliente solo en memoria', items: [{ variante_id: 1, cantidad: 1 }] });
  await pause(200);
  const ownReads = () => customer.requests.filter((item) => item.path === '/api/pedidos/' + orderId).length;
  const beforeOther = ownReads();
  await request('/pedidos/' + other.pedido.id + '/estado', 'PATCH', { estado: 'enviado' });
  await pause(400);
  assert.equal(ownReads(), beforeOther);
  assert.equal(customer.requests.filter((item) => item.path === '/api/pedidos' && item.method === 'POST').length, 1);
  assert.equal(customer.requests.filter((item) => item.path === '/api/pedidos' && item.method === 'GET').length, 0);
  pass('sin búsquedas ajenas, sin GET de lista y sin consultas por eventos de otro ID');

  const noPolling = ownReads();
  await pause(1200);
  assert.equal(ownReads(), noPolling);
  await customer.evaluate("(async()=>{const {default:socket}=await import('/src/services/socket.js');socket.disconnect();})()");
  await customer.wait("document.querySelector('.fashion-tracking-connection')?.textContent.includes('Sin conexión')");
  await request('/pedidos/' + orderId + '/estado', 'PATCH', { estado: 'preparando' });
  await customer.evaluate("(async()=>{const {default:socket}=await import('/src/services/socket.js');socket.connect();})()");
  await customer.wait("document.querySelector('.fashion-tracking-current h2')?.textContent==='En preparación' && document.querySelector('.fashion-tracking-connection.is-connected')");
  pass('sin polling; reconexión recupera el estado perdido durante la desconexión');
  await customer.call('Page.reload');
  await customer.wait("document.querySelector('.fashion-tracking-current h2')?.textContent==='En preparación'");
  await customer.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 1000, deviceScaleFactor: 1, mobile: false });
  assert.ok(await customer.evaluate('document.documentElement.scrollWidth<=innerWidth'));
  await customer.shot('seguimiento-movil');
  for (const width of [320, 768]) {
    await customer.call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    assert.ok(await customer.evaluate('document.documentElement.scrollWidth<=innerWidth'));
  }
  pass('referencia propia sobrevive a recarga y el seguimiento funciona en móvil');

  await adminA.navigate('/');
  await adminA.wait("document.querySelector('.fashion-card')");
  assert.ok(await adminA.evaluate("(async()=>{const {default:socket}=await import('/src/services/socket.js');return socket.connected;})()"));
  await adminA.click('.fashion-card .fashion-btn-outline');
  await adminA.wait("document.querySelector('.fashion-detail-cta')");
  pass('catálogo, detalle y conexión compartida siguen funcionando al salir del panel');
  assert.equal(exceptions.length, 0, 'sin excepciones de JavaScript');
  console.log(`PASS sin excepciones de JavaScript. Capturas: ${artifacts}`);
} finally {
  for (const page of pages) {
    await browser.call('Target.closeTarget', { targetId: page.targetId });
    page.close();
  }
  browser.close();
}
