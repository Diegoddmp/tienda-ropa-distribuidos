// NUEVO: referencia local del último pedido creado en esta pestaña. No es autenticación.
const TRACKING_KEY = 'tienda.ultimo-pedido';

export function readTrackedOrder() {
  try {
    const id = JSON.parse(window.sessionStorage.getItem(TRACKING_KEY))?.id;
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

export function rememberTrackedOrder(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  try {
    // No se guardan nombres, importes, detalles de compra ni listas de otros pedidos.
    window.sessionStorage.setItem(TRACKING_KEY, JSON.stringify({ id }));
  } catch {
    // Si el navegador bloquea sessionStorage, el seguimiento sigue disponible en memoria.
  }
  return id;
}
