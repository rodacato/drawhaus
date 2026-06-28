import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/components/Toast";
import { ConfirmProvider } from "@/components/ConfirmDialog";

type RenderOptions = {
  route?: string;
  /** When the component reads route params, mount it under this path pattern. */
  path?: string;
};

/** Render a screen wrapped in the app's real providers (router + theme + auth + toast + confirm). */
export function renderWithProviders(ui: ReactElement, { route = "/", path }: RenderOptions = {}) {
  const tree = path ? <Routes><Route path={path} element={ui} /></Routes> : ui;
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>{tree}</ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}
