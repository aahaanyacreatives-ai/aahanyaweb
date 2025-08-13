"use client"

import { useEffect } from 'react';

export function ErrorSuppressor() {
  useEffect(() => {
    // Suppress browser extension hydration warnings
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.error = (...args) => {
      if (
        typeof args[0] === 'string' && 
        (args[0].includes('fdprocessedid') || 
         args[0].includes('Extra attributes from the server'))
      ) {
        return;
      }
      originalError.apply(console, args);
    };
    
    console.warn = (...args) => {
      if (
        typeof args[0] === 'string' && 
        args[0].includes('fdprocessedid')
      ) {
        return;
      }
      originalWarn.apply(console, args);
    };
    
    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  return null;
}
