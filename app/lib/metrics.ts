// In-memory metrics store (reset on restart)
// Note: These metrics reset whenever the server restarts
interface Metrics {
  requestCount: number;
  slowQueries: number;
  errors: number;
}

interface ResponseTimeStore {
  times: number[];
  maxSize: number;
}

export const metrics: Metrics = {
  requestCount: 0,
  slowQueries: 0,
  errors: 0,
};

// Track response times (circular buffer)
export const responseTimeStore: ResponseTimeStore = {
  times: [],
  maxSize: 100,
};

export function recordResponseTime(time: number): void {
  responseTimeStore.times.push(time);
  if (responseTimeStore.times.length > responseTimeStore.maxSize) {
    responseTimeStore.times.shift();
  }

  // Track slow queries (>1s)
  if (time > 1000) {
    metrics.slowQueries++;
  }
}

export function incrementErrorCount(): void {
  metrics.errors++;
}

export function getAverageResponseTime(): number {
  if (responseTimeStore.times.length === 0) return 0;
  const sum = responseTimeStore.times.reduce((a, b) => a + b, 0);
  return Math.round(sum / responseTimeStore.times.length);
}

export function getP95ResponseTime(): number {
  if (responseTimeStore.times.length === 0) return 0;
  const sorted = [...responseTimeStore.times].sort((a, b) => a - b);
  return Math.round(sorted[Math.floor(sorted.length * 0.95)] || 0);
}

export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}
