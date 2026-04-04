import * as React from "react"

import { Skeleton } from "./skeleton"

export const RouteSkeleton: React.FC = () => {
  return (
    <div className="flex min-h-screen w-full flex-col space-y-6 bg-[#F6F8FC] px-5 py-6 md:px-8 xl:px-10">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-10 w-44" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-[420px] w-full" />
    </div>
  )
}

export default RouteSkeleton
