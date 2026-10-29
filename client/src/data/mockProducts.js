export const products = [
  {
    id: 1,
    categoria: { id: 1, nombre: "Camisetas" },
    nombre: "Camiseta Básica Oversize",
    descripcion: "Camiseta de algodón peinado con corte oversize.",
    precio: 15.99,
    imagen_url: "https://via.placeholder.com/250x300?text=Camiseta+Oversize",
    activo: true,
    variantes: [
      { id: 1, talla: "M", color: "Negro", sku: "CAM-OVE-M-NEG", stock: 15 },
      { id: 2, talla: "L", color: "Negro", sku: "CAM-OVE-L-NEG", stock: 10 },
      { id: 3, talla: "XL", color: "Blanco", sku: "CAM-OVE-XL-BLA", stock: 0 } // Ejemplo sin stock
    ]
  },
  {
    id: 2,
    categoria: { id: 2, nombre: "Pantalones" },
    nombre: "Pantalón Cargo",
    descripcion: "Pantalón resistente con múltiples bolsillos laterales.",
    precio: 35.50,
    imagen_url: "https://via.placeholder.com/250x300?text=Pantalon+Cargo",
    activo: true,
    variantes: [
      { id: 4, talla: "S", color: "Verde Oliva", sku: "PAN-CAR-S-VER", stock: 5 },
      { id: 5, talla: "M", color: "Verde Oliva", sku: "PAN-CAR-M-VER", stock: 12 },
      { id: 6, talla: "L", color: "Beige", sku: "PAN-CAR-L-BEI", stock: 8 }
    ]
  },
  {
    id: 3,
    categoria: { id: 3, nombre: "Accesorios" },
    nombre: "Gorra Clásica",
    descripcion: "Gorra de béisbol ajustable.",
    precio: 12.00,
    imagen_url: "https://via.placeholder.com/250x300?text=Gorra+Clasica",
    activo: true,
    variantes: [
      { id: 7, talla: "UNICA", color: "Azul Marino", sku: "GOR-CLA-UNI-AZU", stock: 20 }
    ]
  }
];