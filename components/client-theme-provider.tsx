"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

const THEMES = [
  {
    name: "Clássico (Marrom)",
    primary: "#4d403a",
    palette: {
      50: "#f8f7f7",
      100: "#efeceb",
      200: "#dcd6d4",
      300: "#c0b4b0",
      400: "#a3908a",
      500: "#86716a",
      600: "#4d403a",
      700: "#3f3430",
      800: "#352c28",
      900: "#2c2522",
    },
  },
  {
    name: "Esmeralda (Verde)",
    primary: "#059669",
    palette: {
      50: "#ecfdf5",
      100: "#d1fae5",
      200: "#a7f3d0",
      300: "#6ee7b7",
      400: "#34d399",
      500: "#10b981",
      600: "#059669",
      700: "#047857",
      800: "#065f46",
      900: "#064e3b",
    },
  },
  {
    name: "Oceano (Azul)",
    primary: "#2563eb",
    palette: {
      50: "#eff6ff",
      100: "#dbeafe",
      200: "#bfdbfe",
      300: "#93c5fd",
      400: "#60a5fa",
      500: "#3b82f6",
      600: "#2563eb",
      700: "#1d4ed8",
      800: "#1e40af",
      900: "#1e3a8a",
    },
  },
  {
    name: "Ametista (Roxo)",
    primary: "#7c3aed",
    palette: {
      50: "#f5f3ff",
      100: "#ede9fe",
      200: "#ddd6fe",
      300: "#c4b5fd",
      400: "#a78bfa",
      500: "#8b5cf6",
      600: "#7c3aed",
      700: "#6d28d9",
      800: "#5b21b6",
      900: "#4c1d95",
    },
  },
  {
    name: "Sunset (Laranja)",
    primary: "#ea580c",
    palette: {
      50: "#fff7ed",
      100: "#ffedd5",
      200: "#fed7aa",
      300: "#fdba74",
      400: "#fb923c",
      500: "#f97316",
      600: "#ea580c",
      700: "#c2410c",
      800: "#9a3412",
      900: "#7c2d12",
    },
  },
];

export function ClientThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  React.useEffect(() => {
    // Initialize custom color on mount
    const savedPrimary = localStorage.getItem("theme-primary");
    if (savedPrimary) {
      const theme = THEMES.find((t) => t.primary === savedPrimary);
      if (theme) {
        const root = document.documentElement;
        // root.style.setProperty('--primary', theme.primary) // Handled by CSS now
        Object.entries(theme.palette).forEach(([key, value]) => {
          root.style.setProperty(`--color-primary-${key}`, value);
        });
      }
    }
  }, []);

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
