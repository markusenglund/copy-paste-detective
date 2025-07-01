export function formatSize(bytes: number): string {
  if (bytes < 1_000) {
    return `${bytes} B`;
  }
  if (bytes < 10_000) {
    return `${(bytes / 1000).toFixed(2)} kB`;
  }
  if (bytes < 100_000) {
    return `${(bytes / 1000).toFixed(1)} kB`;
  }
  if (bytes < 1_000_000) {
    return `${(bytes / 1000).toFixed(0)} kB`;
  }
  if (bytes < 10_000_000) {
    return `${(bytes / 1_000_000).toFixed(2)} MB`;
  }
  if (bytes < 100_000_000) {
    return `${(bytes / 1_000_000).toFixed(1)} MB`;
  }
  if (bytes < 1_000_000_000) {
    return `${(bytes / 1_000_000).toFixed(0)} MB`;
  }
  return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
}
