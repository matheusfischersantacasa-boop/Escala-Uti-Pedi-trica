import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

function showFatalError(title, detail) {
  const el = document.createElement("div");
  el.style.cssText =
    "position:fixed;inset:0;z-index:99999;background:#fff1f2;color:#7f1d1d;padding:16px;overflow:auto;font-family:monospace;font-size:12px;white-space:pre-wrap;";
  el.innerHTML =
    '<div style="font-weight:bold;font-size:15px;margin-bottom:8px;">' +
    title +
    "</div><div>" +
    (detail || "").replace(/</g, "&lt;") +
    "</div>";
  document.body.appendChild(el);
}

window.addEventListener("error", (e) => {
  showFatalError("Erro JavaScript:", (e.message || "") + "\n" + (e.error && e.error.stack ? e.error.stack : ""));
});

window.addEventListener("unhandledrejection", (e) => {
  showFatalError("Erro (promise):", String(e.reason && e.reason.stack ? e.reason.stack : e.reason));
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
