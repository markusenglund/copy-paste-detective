import pino from "pino";
import pinoPretty from "pino-pretty";

const logLevel = process.env.LOG_LEVEL || "info";
export const logger = pino(
  {
    level: logLevel,
  },
  pinoPretty({
    colorize: true,
    ignore: "pid,hostname",
    sync: true,
  }),
);
