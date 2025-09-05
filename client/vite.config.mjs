import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev proxy so the client can hit your Node server seamlessly
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:3000",
      "/downloads": "http://localhost:3000",
    },
  },
});
