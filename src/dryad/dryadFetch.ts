import pThrottle from "p-throttle";
import { logger } from "../utils/logger";

// The Dryad API has a global rate limit of 120 requests per minute. We use a throttle with a smaller window to prevent bursts.
const throttle = pThrottle({
  limit: 10,
  interval: 5000,
  onDelay: () => {
    logger.debug("Rate limit: Request queued, waiting for available slot...");
  },
});

// Create throttled fetch function
const throttledFetch = throttle(
  async (url: string, options?: RequestInit): Promise<Response> => {
    logger.debug(`Rate limit: Making request to ${url}`);
    return fetch(url, options);
  },
);

// Export wrapper function for cleaner usage
export async function dryadFetch(
  url: string,
  options?: RequestInit,
): Promise<Response> {
  return throttledFetch(url, options);
}

// Export throttle info for debugging
export const getRateLimitInfo = (): {
  queueSize: number;
  isEnabled: boolean;
} => ({
  queueSize: throttledFetch.queueSize,
  isEnabled: throttledFetch.isEnabled,
});
