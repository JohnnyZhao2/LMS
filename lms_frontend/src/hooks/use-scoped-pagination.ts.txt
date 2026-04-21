import * as React from 'react';

interface UseScopedPaginationOptions {
  scopeKey: string;
  initialPage?: number;
  initialPageSize?: number;
}

export const useScopedPagination = ({
  scopeKey,
  initialPage = 1,
  initialPageSize = 10,
}: UseScopedPaginationOptions) => {
  const [pagination, setPagination] = React.useState({
    page: initialPage,
    pageSize: initialPageSize,
    scopeKey,
  });

  const page = pagination.scopeKey === scopeKey ? pagination.page : initialPage;
  const pageSize = pagination.pageSize;

  const onPageChange = React.useCallback((pageIndex: number) => {
    setPagination((prev) => ({
      ...prev,
      page: pageIndex + 1,
      scopeKey,
    }));
  }, [scopeKey]);

  const onPageSizeChange = React.useCallback((nextPageSize: number) => {
    setPagination((prev) => ({
      ...prev,
      page: initialPage,
      pageSize: nextPageSize,
      scopeKey,
    }));
  }, [initialPage, scopeKey]);

  return {
    page,
    pageIndex: page - 1,
    pageSize,
    onPageChange,
    onPageSizeChange,
  };
};
