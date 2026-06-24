import { Router } from "express";
import { checkDatabaseConnection } from "../db/pool.js";

export const healthRouter = Router();

function normalizeIp(ip: string | undefined) {
  if (!ip) return "Unknown";
  const cleaned = ip.replace(/^::ffff:/, "");
  return cleaned === "::1" ? "127.0.0.1" : cleaned;
}

healthRouter.get("/", async (_request, response, next) => {
  try {
    const database = await checkDatabaseConnection();

    response.json({
      ok: true,
      service: "filehistoryamc-backend",
      database: {
        ok: database?.ok === 1,
        time: database?.now,
      },
    });
  } catch (error) {
    next(error);
  }
});

healthRouter.get("/ip", (request, response) => {
  const forwardedFor = request.headers["x-forwarded-for"];
  const forwardedIp = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor?.split(",")[0]?.trim();

  response.json({
    ip: normalizeIp(forwardedIp || request.ip || request.socket.remoteAddress),
  });
});
