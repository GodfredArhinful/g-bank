import { createApp } from "./app.ts";
import { loadConfig } from "./config.ts";

const config = loadConfig();
const app = createApp(config);

app.listen(config.PORT, () => {
  console.log(`G-Bank API listening on http://localhost:${config.PORT}`);
});
