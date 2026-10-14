import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/common/ErrorBoundary.jsx'

// Parche de protección global contra DOMException causados por Google Translate
// o extensiones del navegador que mutan el DOM (removeChild / insertBefore)
if (typeof window !== 'undefined') {
  if (!window.__REACT_TRANSLATION_CRASH_PATCH_INSTALLED__) {
    window.__REACT_TRANSLATION_CRASH_PATCH_INSTALLED__ = true;

    const originalRemoveChild = Node.prototype.removeChild;
    Node.prototype.removeChild = function (child) {
      if (child && child.parentNode !== this) {
        if (console && console.warn) {
          console.warn('[LIATER SafeDOM] removeChild suprimido (nodo reubicado por traductor o extensión externa):', child);
        }
        return child;
      }
      return originalRemoveChild.call(this, child);
    };

    const originalInsertBefore = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function (newNode, referenceNode) {
      if (referenceNode && referenceNode.parentNode !== this) {
        if (console && console.warn) {
          console.warn('[LIATER SafeDOM] insertBefore suprimido (nodo de referencia reubicado por traductor o extensión externa):', referenceNode);
        }
        return newNode;
      }
      return originalInsertBefore.call(this, newNode, referenceNode);
    };
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

