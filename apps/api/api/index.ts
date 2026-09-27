// Vercel serverless entry point. An Express app is itself a valid
// (req, res) handler, so re-exporting it is all that is needed — this file
// exists to make the function explicit instead of relying on Vercel's
// entry-file auto-detection (which has historically picked up other files and
// crashed on the missing default export).
import app from "../src/app";

export default app;
