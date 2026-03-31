import React, { createContext, useContext, useState, useCallback } from "react";
import { Toast } from "../components/ui/Toast";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [state, setState] = useState({
    visible: false,
    message: "",
    type: "default",
    action: null,
    duration: 5000,
  });

  const dismissToast = useCallback(() => {
    setState((prev) => ({ ...prev, visible: false }));
  }, []);

  const showToast = useCallback((message, options = {}) => {
    setState({
      visible: true,
      message,
      type: options.type || "default",
      action: options.action || null,
      duration: options.duration !== undefined ? options.duration : 5000,
    });
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <Toast
        visible={state.visible}
        message={state.message}
        type={state.type}
        action={state.action}
        duration={state.duration}
        onClose={dismissToast}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
