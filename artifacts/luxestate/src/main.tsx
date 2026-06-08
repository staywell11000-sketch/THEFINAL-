import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Unregister any lingering service workers in development.
// In production the PWA SW is registered normally via vite-plugin-pwa.
if (import.meta.env.DEV && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const reg of registrations) {
      reg.unregister();
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
