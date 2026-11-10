import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { applyBranding } from "./config/branding.js";
import App from "./App.jsx";
import "./index.css";

applyBranding();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
