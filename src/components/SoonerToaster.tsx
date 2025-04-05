"use client";
import { Toaster } from "sonner";

export function SonnerToaster() {
  return (
    <Toaster
      position="bottom-left"
      toastOptions={{
        style: {
          background: "#1e1e2e",
          color: "white",
          border: "1px solid #383854",
        },
        className: "sonner-toast",
        duration: 5000,
      }}
    />
  );
}
