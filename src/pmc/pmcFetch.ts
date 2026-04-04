import pThrottle from "p-throttle";
import { logger } from "../utils/logger";

// Europe PMC: ~25 req/sec, we'll be conservative with 20 req/5sec
const europePmcThrottle = pThrottle({
  limit: 20,
  interval: 5000,
  onDelay: () => {
    logger.debug(
      "Rate limit: Europe PMC request queued, waiting for available slot...",
    );
  },
});

const throttledEuropePmcFetch = europePmcThrottle(
  async (url: string, options?: RequestInit): Promise<Response> => {
    logger.debug(`Europe PMC request: ${url}`);
    return fetch(url, options);
  },
);

export async function europePmcFetch(
  url: string,
  options?: RequestInit,
): Promise<Response> {
  return throttledEuropePmcFetch(url, options);
}

export async function s3Fetch(
  url: string,
  options?: RequestInit,
): Promise<Response> {
  logger.debug(`S3 request: ${url}`);
  return fetch(url, options);
}
