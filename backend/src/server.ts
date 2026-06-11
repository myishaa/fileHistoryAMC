import cors from "cors";
import "dotenv/config";
import express, { type ErrorRequestHandler } from "express";
import { healthRouter } from "./routes/health.js";

const app = express();
const port = Number(process.env.PORT ?? 3000);
const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";

app.use(
  cors({
    origin: frontendOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));

app.get("/", (_request, response) => {
  response.json({ ok: true, service: "recordkeeper-backend" });
});

app.use("/api/health", healthRouter);

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({
    ok: false,
    error: error instanceof Error ? error.message : "Unexpected server error",
  });
};

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Recordkeeper backend listening on http://localhost:${port}`);
});
