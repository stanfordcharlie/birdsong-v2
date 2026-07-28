import { defineConfig } from "vitest/config";
import path from "path";

// Tests are colocated as *.test.ts next to the source they cover. Node
// environment only: everything under test here is pure server-side logic,
// nothing touches the DOM or React.
export default defineConfig({
  resolve: {
    // Mirrors the "@/*" -> "./*" path alias in tsconfig.json so tests can
    // import exactly the way the app does.
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
  },
});
