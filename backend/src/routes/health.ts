import { Router } from "express";
import { checkDatabaseConnection } from "../db/pool.js";

export const healthRouter = Router();

healthRouter.get("/", async (_request, response, next) => {
  try {
    const database = await checkDatabaseConnection();

    response.json({
      ok: true,
      service: "recordkeeper-backend",
      database: {
        ok: database?.ok === 1,
        time: database?.now,
      },
    });
  } catch (error) {
    next(error);
  }
});
