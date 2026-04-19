export default function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-slate-800/60 rounded-2xl border border-slate-700/50" />
        ))}
      </div>
      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-72 bg-slate-800/60 rounded-2xl border border-slate-700/50" />
        ))}
      </div>
      {/* Table */}
      <div className="h-64 bg-slate-800/60 rounded-2xl border border-slate-700/50" />
    </div>
  );
}
