// NUEVO: servidor de integración aislado. Ejecuta las rutas reales con un pool en memoria.
// No conecta a PostgreSQL ni modifica datos del proyecto.
const http = require('node:http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

async function createMemoryServer(port = 0) {
  const state = { stock: 8, orders: [], details: [], movements: [], log: [], failCommit: false };
  const variant = () => ({ id: 1, variante_id: 1, producto_id: 1, nombre: 'Prenda de integración', producto: 'Prenda de integración', talla: 'M', color: 'Negro', precio: '15.00', stock: state.stock });
  const product = () => ({ id: 1, nombre: variant().nombre, descripcion: 'Producto exclusivo del servidor de pruebas en memoria.', precio: '15.00', categoria: 'Camisetas', imagen_url: null, variantes: [{ id: 1, talla: 'M', color: 'Negro', stock: state.stock }] });
  const rows = (items) => ({ rows: items, rowCount: items.length });

  async function query(sql, params = []) {
    const text = sql.replace(/\s+/g, ' ').trim();
    state.log.push(text.split(' ').slice(0, 3).join(' '));
    if (text.includes('FROM variantes_producto') && text.includes('ANY(')) return rows(params[0].includes(1) ? [variant()] : []);
    if (text.includes('FROM variantes_producto') && text.startsWith('SELECT')) {
      if (text.includes('WHERE id = $1') && Number(params[0]) !== 1) return rows([]);
      return rows([variant()]);
    }
    if (text.startsWith('UPDATE variantes_producto')) { state.stock = params[0]; return rows([variant()]); }
    if (text.startsWith('INSERT INTO movimientos_inventario')) { state.movements.push(params); return rows([]); }
    if (text.startsWith('INSERT INTO pedidos')) {
      const order = { id: state.orders.length + 1, nombre_cliente: params[0], total: params[1], estado: 'pendiente', fecha_pedido: new Date().toISOString() };
      state.orders.push(order); return rows([order]);
    }
    if (text.startsWith('INSERT INTO detalle_pedido')) {
      const item = { id: state.details.length + 1, pedido_id: params[0], variante_id: params[1], cantidad: params[2], precio_unitario: params[3], nombre_producto: params[4], talla: params[5], color: params[6] };
      state.details.push(item); return rows([item]);
    }
    if (text.startsWith('SELECT') && text.includes('FROM detalle_pedido')) return rows(state.details.filter((item) => item.pedido_id === Number(params[0])));
    if (text.startsWith('SELECT') && text.includes('FROM pedidos')) return rows(params.length ? state.orders.filter((order) => order.id === Number(params[0])) : [...state.orders].reverse());
    if (text.startsWith('UPDATE pedidos')) {
      const order = state.orders.find((item) => item.id === Number(params[1]));
      if (!order) return rows([]);
      order.estado = params[0]; return rows([order]);
    }
    throw new Error(`Consulta no contemplada en el servidor de pruebas: ${text}`);
  }

  const pool = {
    query,
    async connect() {
      let snapshot;
      return {
        async query(sql, params) {
          if (sql === 'BEGIN') { snapshot = structuredClone({ stock: state.stock, orders: state.orders, details: state.details, movements: state.movements }); state.log.push('BEGIN'); return rows([]); }
          if (sql === 'COMMIT') { if (state.failCommit) throw new Error('Fallo de COMMIT simulado'); state.log.push('COMMIT'); return rows([]); }
          if (sql === 'ROLLBACK') { if (snapshot) Object.assign(state, snapshot); state.log.push('ROLLBACK'); return rows([]); }
          return query(sql, params);
        },
        release() {},
      };
    },
  };

  // Inyecta la dependencia antes de cargar las rutas; no requiere cambios en su código.
  const dbPath = require.resolve('../../config/db');
  const previousDb = require.cache[dbPath];
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { pool } };
  const inventoryPath = require.resolve('../../routes/inventario.routes');
  const ordersPath = require.resolve('../../routes/pedidos.routes');
  delete require.cache[inventoryPath]; delete require.cache[ordersPath];
  const inventoryRouter = require(inventoryPath);
  const ordersRouter = require(ordersPath);
  if (previousDb) require.cache[dbPath] = previousDb; else delete require.cache[dbPath];

  const app = express();
  app.use(cors()); app.use(express.json());
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });
  app.set('io', io);
  app.use('/api/inventario', inventoryRouter);
  app.use('/api/pedidos', ordersRouter);
  app.get('/api/productos', (_req, res) => res.json([product()]));
  app.get('/api/productos/:id', (req, res) => Number(req.params.id) === 1 ? res.json(product()) : res.sendStatus(404));
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  return { state, io, url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((resolve) => io.close(resolve)) };
}

module.exports = { createMemoryServer };

if (require.main === module && process.argv.includes('--serve')) {
  createMemoryServer(Number(process.env.TEST_PORT || 3001)).then(({ url }) => console.log(`Servidor aislado de pruebas: ${url}`));
}
