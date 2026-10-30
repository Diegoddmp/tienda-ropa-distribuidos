// NUEVO: referencia local mínima, sin datos personales ni almacenamiento global de pedidos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readTrackedOrder, rememberTrackedOrder } from '../src/services/orderTracking.js';

test('referencia de seguimiento local tolerante a datos inválidos y almacenamiento bloqueado', (t) => {
  const originalWindow = globalThis.window;
  t.after(() => { if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow; });
  const items = new Map();
  globalThis.window = { sessionStorage: { getItem: (key) => items.get(key) ?? null, setItem: (key, value) => items.set(key, value) } };
  assert.equal(readTrackedOrder(), null);
  assert.equal(rememberTrackedOrder('12'), 12);
  assert.deepEqual(JSON.parse(items.get('tienda.ultimo-pedido')), { id: 12 });
  assert.equal(readTrackedOrder(), 12);
  for (const value of ['no-json', '{"id":-1}', '{"id":"12"}', '{"id":9007199254740992}']) {
    items.set('tienda.ultimo-pedido', value);
    assert.equal(readTrackedOrder(), null);
  }
  for (const value of [-1, 0, 2.5, 'no-id', Number.MAX_SAFE_INTEGER + 1]) assert.equal(rememberTrackedOrder(value), null);
  globalThis.window = { get sessionStorage() { throw new Error('Almacenamiento bloqueado'); } };
  assert.equal(readTrackedOrder(), null);
  assert.equal(rememberTrackedOrder(15), 15);
});
