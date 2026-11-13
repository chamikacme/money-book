import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <Skeleton className={`loading-skeleton ${className}`} aria-hidden="true" />;
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return <div className="magic-card loading-list" aria-label="Loading content" aria-busy="true">
    <div className="loading-list-head"><SkeletonBlock className="skeleton-heading" /><SkeletonBlock className="skeleton-control" /></div>
    {Array.from({ length: rows }, (_, index) => <div className="loading-row" key={index}>
      <div className="loading-row-main"><SkeletonBlock className="skeleton-avatar" /><div className="loading-row-copy"><SkeletonBlock className="skeleton-line" /><SkeletonBlock className="skeleton-line skeleton-line-short" /></div></div>
      <SkeletonBlock className="skeleton-value" />
    </div>)}
  </div>;
}

export function DashboardSkeleton() {
  return <div className="dashboard-loading" aria-label="Loading dashboard" aria-busy="true">
    <div className="dashboard-loading-stats">{[0, 1, 2].map((item) => <div className="magic-card loading-stat" key={item}><SkeletonBlock className="skeleton-line skeleton-line-short" /><SkeletonBlock className="skeleton-stat-value" /><SkeletonBlock className="skeleton-line" /></div>)}</div>
    <div className="dashboard-loading-lower"><ListSkeleton rows={4} /><ListSkeleton rows={4} /></div>
  </div>;
}
