import { useState } from 'react';

// El fallo se asocia a la URL: una nueva fotografía puede cargarse sin remontar la tarjeta.
export default function ProductImage({ src, alt, priority = false }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const imageSrc = typeof src === 'string' ? src.trim() : '';

  if (!imageSrc || failedSrc === imageSrc) {
    return (
      <div className="fashion-image-placeholder" role="img" aria-label={`${alt}. Fotografía no disponible`}>
        <svg width="74" height="60" viewBox="0 0 80 64" fill="none" aria-hidden="true">
          <path d="M35 16a6 6 0 1 1 8 5c-2 1-3 2-3 5v4L9 49a3 3 0 0 0 2 5h58a3 3 0 0 0 2-5L40 30" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>Imagen no disponible</span>
        <small>{alt}</small>
      </div>
    );
  }

  return <img src={imageSrc} alt={alt} loading={priority ? 'eager' : 'lazy'} decoding="async" onError={() => setFailedSrc(imageSrc)} />;
}
