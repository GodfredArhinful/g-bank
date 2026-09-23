import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "shared",
          include: ["shared/test/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "server",
          include: ["server/test/**/*.test.ts"],
          // Test files share one database, so they must not run at the same time.
          fileParallelism: false,
          globalSetup: ["server/test/globalSetup.ts"],
          setupFiles: ["server/test/setup.ts"],
        },
      },
    ],
  },
});
