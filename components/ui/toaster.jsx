"use client";

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "./toast";
import { useToast } from "../../hooks/use-toast.js";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props} className="bg-white border border-gray-200 shadow-lg">
            <div className="grid gap-1">
              {title && <ToastTitle className="text-gray-900 font-semibold">{title}</ToastTitle>}
              {description && (
                <ToastDescription className="text-gray-700">{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport className="fixed bottom-0 right-0 flex flex-col p-4 gap-2 w-full md:max-w-[420px] max-h-screen z-50" />
    </ToastProvider>
  );
} 