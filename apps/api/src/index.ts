import app from "./app";

export default app;

// Long-running hosts (local dev, a VM, Render, Fly, ...) bind a port. Vercel
// invokes the exported app as a serverless function instead — calling listen()
// there is never what you want.
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 8000;
  app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
  });
}
