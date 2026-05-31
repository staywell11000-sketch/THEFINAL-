import { db } from "./index";
import { SQL, sql, eq, and, or, ilike, desc, asc, count, inArray } from "drizzle-orm";
import { PgTableWithColumns } from "drizzle-orm/pg-core";

export type PaginationParams = {
  page?: number;
  pageSize?: number;
};

export type SortParams = {
  sortBy?: string;
  sortDir?: "asc" | "desc";
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function paginate<T>(
  query: Promise<T[]>,
  countQuery: Promise<{ count: number }[]>,
  page = 1,
  pageSize = 20,
): Promise<PaginatedResult<T>> {
  const [data, countResult] = await Promise.all([query, countQuery]);
  const total = Number(countResult[0]?.count ?? 0);
  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export function buildOffset(page = 1, pageSize = 20): number {
  return (Math.max(1, page) - 1) * pageSize;
}

export type WhereCondition = SQL | undefined;

export function buildSearch(
  fields: SQL[],
  term: string | undefined,
): WhereCondition {
  if (!term?.trim()) return undefined;
  const pattern = `%${term.trim()}%`;
  const conditions = fields.map((f) => ilike(f as any, pattern));
  return or(...conditions);
}

export function timestamps() {
  return {
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function touch() {
  return { updatedAt: new Date() };
}

export { db, sql, eq, and, or, ilike, desc, asc, count, inArray };
