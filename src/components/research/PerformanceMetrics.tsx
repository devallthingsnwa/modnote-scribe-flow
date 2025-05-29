
interface PerformanceMetrics {
  searchTime: number;
  contextTime: number;
  apiTime: number;
  totalTime: number;
}

interface PerformanceMetricsProps {
  metrics: PerformanceMetrics | null;
}

export function PerformanceMetrics({ metrics }: PerformanceMetricsProps) {
  if (!metrics) return null;

  return (
    <div className="text-xs text-muted-foreground mt-1 text-center">
      Context: {metrics.contextTime.toFixed(0)}ms | API: {metrics.apiTime.toFixed(0)}ms | Total: {metrics.totalTime.toFixed(0)}ms
    </div>
  );
}
