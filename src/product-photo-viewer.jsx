import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export function ProductPhotoViewer({ photo, name, closeLabel, onClose }) {
  const closeRef = useRef(null);
  const callbackRef = useRef(onClose);
  callbackRef.current = onClose;
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKeyDown = event => {
      if (event.key === 'Escape') callbackRef.current();
      if (event.key === 'Tab') { event.preventDefault(); closeRef.current?.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, []);
  return <div className="photo-viewer-backdrop" role="dialog" aria-modal="true" aria-label={name} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="photo-viewer-heading"><strong>{name}</strong><button ref={closeRef} type="button" className="photo-viewer-close" onClick={onClose} aria-label={closeLabel}><X size={24}/></button></div>
    <img className="photo-viewer-image" src={photo} alt={name}/>
  </div>;
}
