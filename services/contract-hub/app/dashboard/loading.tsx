export default function Loading() {
  return (
    <div className="min-h-[calc(100vh-4rem)] p-8">
      {/* Header Skeleton */}
      <div className="mb-8">
        <div className="h-8 w-48 bg-gray-800 rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-72 bg-gray-800 rounded animate-pulse" />
      </div>

      {/* Quick Actions Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-4 bg-gray-800/50 rounded-xl border border-gray-800">
            <div className="w-10 h-10 bg-gray-700 rounded-lg animate-pulse" />
            <div className="h-4 w-24 bg-gray-700 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Stats Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-800/50 rounded-xl border border-gray-800 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-700 rounded-lg animate-pulse" />
                <div>
                  <div className="h-3 w-24 bg-gray-700 rounded animate-pulse mb-2" />
                  <div className="h-6 w-12 bg-gray-700 rounded animate-pulse" />
                </div>
              </div>
              <div className="h-6 w-10 bg-gray-700 rounded-full animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity Skeleton */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-800">
        <div className="px-6 py-4 border-b border-gray-800">
          <div className="h-5 w-32 bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="divide-y divide-gray-800">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 bg-gray-700 rounded-full animate-pulse" />
                <div>
                  <div className="h-4 w-32 bg-gray-700 rounded animate-pulse mb-1" />
                  <div className="h-3 w-48 bg-gray-800 rounded animate-pulse" />
                </div>
              </div>
              <div className="h-3 w-16 bg-gray-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
