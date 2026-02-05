import * as React from "react"

import { Skeleton } from "./skeleton"

export const RouteSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="h-14 border-b border-border bg-background/80 px-6 flex items-center">
        <Skeleton className="h-6 w-40" />
      </div>
      <div className="mx-auto w-full max-w-[1400px] px-6 py-6 space-y-6">
        <Skeleton className="h-7 w-56" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-[420px] w-full" />
      </div>
    </div>
  )
}

export default RouteSkeleton
