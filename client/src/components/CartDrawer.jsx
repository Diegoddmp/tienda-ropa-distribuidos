import { useEffect, useRef } from 'react';

export default function CartDrawer({ children, onClose }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, []);

  const handleKeyDown = (event) => {
    if (event.key !== 'Tab') return;
    const controls = [...dialogRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')];
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="fashion-cart-dialog"
      aria-labelledby="fashion-cart-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onKeyDown={handleKeyDown}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="fashion-cart-shell">
        <div className="fashion-cart-topline">
          <span className="fashion-eyebrow">Tu selección personal</span>
          <button type="button" className="fashion-cart-close" onClick={onClose} aria-label="Cerrar bolsa">Cerrar <span aria-hidden="true">×</span></button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
