import app from "./app";
import { logger } from "./lib/logger";

// Only bind to a port and start listening if we are NOT running on Vercel.
// Vercel automatically sets the "VERCEL" environment variable to "1" in production.
if (!process.env.VERCEL) {
  const port = Number(process.env.PORT || 3000);
  
  app.listen(port, () => {
    logger.info({ port }, "Server listening");
  });
}

// This is the magic line! Vercel Serverless needs the Express app 
// explicitly exported so it can inject the HTTP requests into it.
export default app;
