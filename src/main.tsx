import {createRoot} from 'react-dom/client';
import App from './App';
import './index.css';

// Enable Service Worker for PWA support
if ('serviceWorker' in navigator) {
  const registerSW = () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  };

  if (document.readyState === 'complete') {
    registerSW();
  } else {
    window.addEventListener('load', registerSW);
  }
}

const rootElement = document.getElementById('root')!;

createRoot(rootElement).render(
  <App />,
);
