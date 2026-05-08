// vite.config.ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    plugins: [react(), tailwindcss()],
    define: {
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        "@": path.resolve("D:\\Wedding Preparations\\isv-dcc-wedding-invite", "./src")
      }
    },
    server: {
      hmr: process.env.DISABLE_HMR !== "true"
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB0YWlsd2luZGNzcyBmcm9tICdAdGFpbHdpbmRjc3Mvdml0ZSc7XHJcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XHJcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQge2RlZmluZUNvbmZpZywgbG9hZEVudn0gZnJvbSAndml0ZSc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHttb2RlfSkgPT4ge1xyXG4gIGNvbnN0IGVudiA9IGxvYWRFbnYobW9kZSwgJy4nLCAnJyk7XHJcbiAgcmV0dXJuIHtcclxuICAgIHBsdWdpbnM6IFtyZWFjdCgpLCB0YWlsd2luZGNzcygpXSxcclxuICAgIGRlZmluZToge1xyXG4gICAgICAncHJvY2Vzcy5lbnYuR0VNSU5JX0FQSV9LRVknOiBKU09OLnN0cmluZ2lmeShlbnYuR0VNSU5JX0FQSV9LRVkpLFxyXG4gICAgfSxcclxuICAgIHJlc29sdmU6IHtcclxuICAgICAgYWxpYXM6IHtcclxuICAgICAgICAnQCc6IHBhdGgucmVzb2x2ZShcIkQ6XFxcXFdlZGRpbmcgUHJlcGFyYXRpb25zXFxcXGlzdi1kY2Mtd2VkZGluZy1pbnZpdGVcIiwgJy4vc3JjJyksXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gICAgc2VydmVyOiB7XHJcbiAgICAgIC8vIEhNUiBpcyBkaXNhYmxlZCBpbiBBSSBTdHVkaW8gdmlhIERJU0FCTEVfSE1SIGVudiB2YXIuXHJcbiAgICAgIC8vIERvIG5vdCBtb2RpZnlcdTAwRTJcdTAwODBcdTAwOTRmaWxlIHdhdGNoaW5nIGlzIGRpc2FibGVkIHRvIHByZXZlbnQgZmxpY2tlcmluZyBkdXJpbmcgYWdlbnQgZWRpdHMuXHJcbiAgICAgIGhtcjogcHJvY2Vzcy5lbnYuRElTQUJMRV9ITVIgIT09ICd0cnVlJyxcclxuICAgIH0sXHJcbiAgfTtcclxufSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUVBLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUMsV0FBVTtBQUN0QyxRQUFNLE1BQU0sUUFBUSxNQUFNLEtBQUssRUFBRTtBQUNqQyxTQUFPO0FBQUEsSUFDTCxTQUFTLENBQUMsTUFBTSxHQUFHLFlBQVksQ0FBQztBQUFBLElBQ2hDLFFBQVE7QUFBQSxNQUNOLDhCQUE4QixLQUFLLFVBQVUsSUFBSSxjQUFjO0FBQUEsSUFDakU7QUFBQSxJQUNBLFNBQVM7QUFBQSxNQUNQLE9BQU87QUFBQSxRQUNMLEtBQUssS0FBSyxRQUFRLG9EQUFvRCxPQUFPO0FBQUEsTUFDL0U7QUFBQSxJQUNGO0FBQUEsSUFDQSxRQUFRO0FBQUEsTUFHTixLQUFLLFFBQVEsSUFBSSxnQkFBZ0I7QUFBQSxJQUNuQztBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
