import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import "./index.css";

// Production optimizations
if (import.meta.env.PROD) {
  // Disable React Developer Tools in production
  if (typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ === "object") {
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot = undefined;
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberUnmount = undefined;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
