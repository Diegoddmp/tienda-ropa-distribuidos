
const URL = 'http://localhost:3000/api/pedidos';

async function comprar(nombre) {
    const respuesta = await fetch(URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            nombre_cliente: nombre,
            items: [
                {
                    variante_id: 2,
                    cantidad: 1
                }
            ]
        })
    });

    const datos = await respuesta.json();

    return {
        cliente: nombre,
        codigo: respuesta.status,
        mensaje: datos.mensaje
    };
}

async function probarConcurrencia() {
    console.log('Iniciando compras simultáneas...');

    const identificador = Date.now();

    const resultados = await Promise.all([
        comprar(`Cliente A ${identificador}`),
        comprar(`Cliente B ${identificador}`)
    ]);

    console.table(resultados);

    const exitosas = resultados.filter(r => r.codigo === 201);
    const rechazadas = resultados.filter(r => r.codigo === 409);

    if (exitosas.length === 1 && rechazadas.length === 1) {
        console.log('PRUEBA SUPERADA: solo una compra fue aceptada.');
    } else {
        console.log('PRUEBA NO SUPERADA: revisar resultados.');
    }
}

probarConcurrencia().catch(console.error);
