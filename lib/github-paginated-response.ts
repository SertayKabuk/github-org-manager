export function extractPaginatedItems<T>(response: unknown, key: string): T[] {
  if (Array.isArray(response)) {
    return response as T[];
  }

  if (response && typeof response === "object") {
    const record = response as Record<string, unknown>;

    if (Array.isArray(record.data)) {
      return record.data as T[];
    }

    const data = record.data;
    if (data && typeof data === "object") {
      const nested = (data as Record<string, unknown>)[key];
      if (Array.isArray(nested)) {
        return nested as T[];
      }
    }

    const direct = record[key];
    if (Array.isArray(direct)) {
      return direct as T[];
    }
  }

  return [];
}

interface BillingPageInfo {
  has_next_page?: boolean;
  total_count?: number;
}

export async function fetchBillingPaginatedItems<T>(options: {
  request: <R>(route: string, parameters?: Record<string, unknown>) => Promise<{ data: R }>;
  route: string;
  dataKey: string;
  parameters: Record<string, unknown>;
  perPage?: number;
}): Promise<T[]> {
  const { request, route, dataKey, parameters, perPage = 100 } = options;
  const items: T[] = [];

  for (let page = 1; page < 1000; page += 1) {
    const response = await request<unknown>(route, {
      ...parameters,
      per_page: perPage,
      page,
    });

    const pageItems = extractPaginatedItems<T>(response.data, dataKey);
    items.push(...pageItems);

    const pageInfo = response.data as BillingPageInfo & Record<string, unknown>;
    const hasNextPage = Boolean(pageInfo.has_next_page);

    if (!hasNextPage || pageItems.length === 0) {
      break;
    }
  }

  return items;
}