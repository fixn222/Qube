import { QueryBuilder } from "./query-builder";

export class QubeDb {
  constructor(
    private projectUrl: string,
    private apiKey: string,
  ) {}

  from<T = Record<string, unknown>>(table: string): QueryBuilder<T> {
    return new QueryBuilder<T>(this.projectUrl, table, this.apiKey);
  }
}

export { QueryBuilder } from "./query-builder";
export type { QueryResult } from "./query-builder";
