/**
 * Thin user-scoped wrapper around Next.js's `unstable_cache`. Used by the
 * heavier analytics compute functions (computeProfit, computeBestsellers,
 * computeProfitSeries) so repeat-navigation between /dashboard, /profit,
 * /bestsellers within a few seconds doesn't redo the same DB work.
 *
 * Cache key is automatically derived from the wrapped function's args plus
 * the explicit key array. Tags are user-scoped so one user's mutation never
 * invalidates another user's cache.
 *
 * Server actions and API routes that mutate items / transactions / expenses
 * call `revalidateUserItems(userId)` to drop the cached aggregates.
 */
import { unstable_cache, revalidateTag } from "next/cache";

const REVALIDATE_SECONDS = 60;

export function userItemsTag(userId: string): string {
  return `user:items:${userId}`;
}

/** Drop every analytics cache entry that depends on this user's items /
 *  transactions / expenses. Cheap to call; safe to call from anywhere on
 *  the server. Uses the "default" cacheLife profile so behaviour matches
 *  unstable_cache TTLs configured here. */
export function revalidateUserItems(userId: string): void {
  revalidateTag(userItemsTag(userId), "default");
}

/** Wrap a compute function whose first arg is `userId`. All args are part
 *  of the cache key automatically; the explicit key prefix lets us
 *  namespace different compute functions for the same user. */
export function withUserItemsCache<
  Args extends [userId: string, ...rest: unknown[]],
  R,
>(
  fn: (...args: Args) => Promise<R>,
  key: string,
): (...args: Args) => Promise<R> {
  return async (...args: Args): Promise<R> => {
    const [userId] = args;
    return unstable_cache(fn, [key, userId], {
      tags: [userItemsTag(userId)],
      revalidate: REVALIDATE_SECONDS,
    })(...args);
  };
}
