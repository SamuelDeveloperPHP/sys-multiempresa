import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const root = document.getElementById("jarvis-root");
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
