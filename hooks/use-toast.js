"use client";

import {
  createContext,
  useContext,
  useState,
} from "react";

const ToastContext = createContext({
  toasts: [],
  toast: () => {},
  dismiss: () => {},
});

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const toast = ({ title, description, action, variant, ...props }) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = {
      id,
      title,
      description,
      action,
      variant,
      ...props,
    };
    
    setToasts((prevToasts) => [...prevToasts, newToast]);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      dismiss(id);
    }, 5000);
    
    return id;
  };

  const dismiss = (id) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}; 