/**
 * Processes an array of items in batches, collecting all results.
 *
 * @param items - The array of items to process
 * @param batchSize - Maximum number of items per batch
 * @param processor - Async function that processes a batch and returns results
 * @returns Combined results from all batches
 */
export async function processInBatches<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R[]>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processor(batch);
    results.push(...batchResults);
  }
  return results;
}
