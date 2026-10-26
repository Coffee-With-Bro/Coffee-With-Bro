import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

const container = document.getElementById("root");

if (container)
{
  if (container.hasChildNodes() && !container.innerHTML.includes("<!--ssr-outlet-->"))
  {
    hydrateRoot(
      container,
      <StrictMode>
        <App />
      </StrictMode>,
    );
  }
  else
  {
    createRoot(container).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  }
}
