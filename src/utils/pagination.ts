import { Prisma } from "@prisma/client";

/**
 * Utility for cursor-based pagination with Prisma
 */
export async function paginate<T, K extends keyof T>(
  model: any,
  args: any = {},
  options: {
    limit: number;
    cursorField: K;
    cursorValue?: any;
    order?: "asc" | "desc";
  }
) {
  const { limit, cursorField, cursorValue, order = "desc" } = options;

  const queryArgs: any = {
    ...args,
    take: limit + 1, // Fetch one extra to check if there is a next page
    orderBy: { [cursorField]: order },
  };

  if (cursorValue) {
    queryArgs.cursor = { [cursorField]: cursorValue };
    queryArgs.skip = 1; // Skip the cursor itself
  }

  const items = await model.findMany(queryArgs);
  
  const hasNextPage = items.length > limit;
  const results = hasNextPage ? items.slice(0, limit) : items;
  const nextCursor = hasNextPage ? results[results.length - 1][cursorField] : null;

  return {
    data: results,
    meta: {
      limit,
      hasNextPage,
      nextCursor,
    },
  };
}
