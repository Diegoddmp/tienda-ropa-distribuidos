import React from 'react';
import ProductCatalog from './components/ProductCatalog';

function App() {
  return (
    <div style={{ margin: 0, padding: 0, boxSizing: 'border-box' }}>
      <header style={{ backgroundColor: '#222', color: '#fff', padding: '15px 30px' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Tienda Virtual - Distribuidos</h1>
      </header>
      
      <main style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <ProductCatalog />
      </main>
    </div>
  );
}

export default App;