// NUEVO: pruebas de las rutas existentes y Socket.IO real, sin escrituras en PostgreSQL.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { io } = require('../../client/node_modules/socket.io-client');
const { createMemoryServer } = require('./support/memory-server.cjs');

test('inventario y pedidos: transacciones y eventos hacia dos clientes', { timeout: 15000 }, async (t) => {
  const server = await createMemoryServer();
  const emissions = [];
  const originalEmit = server.io.emit.bind(server.io);
  server.io.emit = (event, ...args) => {
    emissions.push({ event, query: server.state.log.at(-1) });
    return originalEmit(event, ...args);
  };
  const clients = [io(server.url, { autoConnect: false }), io(server.url, { autoConnect: false })];
  t.after(async () => { clients.forEach((client) => client.disconnect()); await server.close(); });
  await Promise.all(clients.map(async (client) => { const ready = once(client, 'connect'); client.connect(); await ready; }));
  const request = (route, method = 'GET', body) => fetch(`${server.url}/api${route}`, { method, headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });

  await t.test('ajuste: dos clientes reciben inventory:update después del COMMIT', async () => {
    const updates = clients.map((client) => once(client, 'inventory:update'));
    const response = await request('/inventario/variante/1', 'PATCH', { stock: 4, motivo: 'Prueba en memoria' });
    assert.equal(response.status, 200);
    await Promise.all(updates);
    assert.equal(server.state.log.at(-1), 'COMMIT');
    assert.equal(emissions.find((event) => event.event === 'inventory:update').query, 'COMMIT');
    assert.equal(server.state.movements.length, 1);
    const snapshots = await Promise.all(clients.map(async () => (await request('/inventario')).json()));
    assert.deepEqual(snapshots.map((items) => items[0].stock), [4, 4]);
  });

  await t.test('validación: rechaza negativos y decimales sin emitir eventos', async () => {
    let count = 0;
    const onUpdate = () => count++;
    clients[0].on('inventory:update', onUpdate);
    for (const stock of [-1, 1.5, '3']) assert.equal((await request('/inventario/variante/1', 'PATCH', { stock })).status, 400);
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(count, 0); assert.equal(server.state.stock, 4);
    clients[0].off('inventory:update', onUpdate);
  });

  await t.test('ROLLBACK: un COMMIT fallido no publica inventory:update', async () => {
    server.state.failCommit = true;
    let count = 0;
    const onUpdate = () => count++;
    clients[0].on('inventory:update', onUpdate);
    assert.equal((await request('/inventario/variante/1', 'PATCH', { stock: 2 })).status, 500);
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(count, 0); assert.equal(server.state.stock, 4); assert.equal(server.state.log.at(-1), 'ROLLBACK');
    server.state.failCommit = false;
    clients[0].off('inventory:update', onUpdate);
  });

  await t.test('compra: conserva order:new, descuento y aviso de inventario', async () => {
    const newOrders = clients.map((client) => once(client, 'order:new'));
    const updates = clients.map((client) => once(client, 'inventory:update'));
    const response = await request('/pedidos', 'POST', { nombre_cliente: 'Cliente de integración en memoria', items: [{ variante_id: 1, cantidad: 1 }] });
    assert.equal(response.status, 201);
    const events = await Promise.all(newOrders);
    await Promise.all(updates);
    assert.equal(events[0][0].pedido.id, 1); assert.equal(events[1][0].pedido.id, 1);
    assert.equal(server.state.stock, 3); assert.equal(server.state.log.at(-1), 'COMMIT');
  });

  await t.test('estados: order:status y GET individual mantienen los estados permitidos', async () => {
    for (const estado of ['pendiente', 'preparando', 'enviado', 'entregado', 'cancelado']) {
      const updates = clients.map((client) => once(client, 'order:status'));
      assert.equal((await request('/pedidos/1/estado', 'PATCH', { estado })).status, 200);
      const events = await Promise.all(updates);
      assert.equal(events[0][0].id, 1); assert.equal(events[1][0].estado, estado);
      assert.equal((await (await request('/pedidos/1')).json()).pedido.estado, estado);
    }
    assert.equal((await request('/pedidos/1/estado', 'PATCH', { estado: 'inexistente' })).status, 400);
  });
});
