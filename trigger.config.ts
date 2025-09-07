import { defineConfig } from "@trigger.dev/sdk";
import { syncVercelEnvVars } from "@trigger.dev/build/extensions/core";


export default defineConfig({
  // Your project ref from the Trigger.dev dashboard
  project: "proj_mtlpwkefabynordqteln", // e.g., "proj_abc123"

  // Directories containing your tasks
  dirs: ["./trigger"], // Customize based on your project structure

  // Retry configuration
  retries: {
    enabledInDev: false, // Enable retries in development
    default: {
      maxAttempts: 1,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },

  // Build configuration (optional)
  build: {
    extensions: [syncVercelEnvVars()], // Build extensions go here
    external: ["sharp"], // Fix sharp dependency
  },

  // Max duration of a task in seconds
  maxDuration: 3600,

  
});