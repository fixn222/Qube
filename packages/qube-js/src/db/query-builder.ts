export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

interface FilterClause {
  column: string;
  operator: string;
  value: string;
}

export interface QueryResult<T> {
  data: T | null;
  error: string | null;
}

export class QueryBuilder<T = Record<string, unknown>> {
  private _method: HttpMethod = "GET";
  private _body: Record<string, unknown> | null = null;
  private _filters: FilterClause[] = [];
  private _selectColumns: string[] = [];
  private _orderCol: string | null = null;
  private _orderDir: "asc" | "desc" = "asc";
  private _limitVal: number | null = null;
  private _offsetVal: number | null = null;

  constructor(
    private projectUrl: string,
    private table: string,
    private apiKey: string,
  ) {}

  select(columns = "*"): this {
    this._selectColumns =
      columns === "*" ? [] : columns.split(",").map((c) => c.trim());
    return this;
  }

  eq(column: string, value: unknown): this {
    this._filters.push({ column, operator: "eq", value: String(value) });
    return this;
  }

  noteq(column: string, value: unknown): this {
    this._filters.push({ column, operator: "neq", value: String(value) });
    return this;
  }

  gt(column: string, value: unknown): this {
    this._filters.push({ column, operator: "gt", value: String(value) });
    return this;
  }

  gte(column: string, value: unknown): this {
    this._filters.push({ column, operator: "gte", value: String(value) });
    return this;
  }

  lt(column: string, value: unknown): this {
    this._filters.push({ column, operator: "lt", value: String(value) });
    return this;
  }

  lte(column: string, value: unknown): this {
    this._filters.push({ column, operator: "lte", value: String(value) });
    return this;
  }

  like(column: string, pattern: string): this {
    this._filters.push({ column, operator: "like", value: pattern });
    return this;
  }

  ilike(column: string, pattern: string): this {
    this._filters.push({ column, operator: "ilike", value: pattern });
    return this;
  }

  is(column: string, value: "null" | "not null"): this {
    this._filters.push({
      column,
      operator: "is",
      value: value === "null" ? "null" : "not null",
    });
    return this;
  }

  order(column: string, direction: "asc" | "desc" = "asc"): this {
    this._orderCol = column;
    this._orderDir = direction;
    return this;
  }

  limit(n: number): this {
    this._limitVal = n;
    return this;
  }

  offset(n: number): this {
    this._offsetVal = n;
    return this;
  }

  insert(data: Record<string, unknown>): this {
    this._method = "POST";
    this._body = data;
    return this;
  }

  update(data: Record<string, unknown>): this {
    this._method = "PATCH";
    this._body = data;
    return this;
  }

  delete(): this {
    this._method = "DELETE";
    return this;
  }

  private getRowIdForMutation(): string {
    const idFilter = this._filters.find(
      (f) => f.column === "id" && f.operator === "eq",
    );

    if (!idFilter) {
      throw new Error(
        'update() and delete() require .eq("id" , rowId ) before executing',
      );
    }

    return idFilter.value;
  }

  private buildUrl(): string {
    const base = `${this.projectUrl.replace(/\/$/, "")}/rest/${encodeURIComponent(this.table)}`;

    if (this._method === "PATCH" || this._method === "DELETE") {
      return `${base}/${encodeURIComponent(this.getRowIdForMutation())}`;
    }

    const params = new URLSearchParams();

    if (this._selectColumns.length > 0) {
      params.set("select", this._selectColumns.join(","));
    }

    for (const { column, operator, value } of this._filters) {
      params.set(column, `${operator}.${value}`);
    }

    if (this._orderCol) {
      params.set("order", `${this._orderCol}.${this._orderDir}`);
    }

    if (this._limitVal !== null) params.set("limit", String(this._limitVal));
    if (this._offsetVal !== null) params.set("offset", String(this._offsetVal));

    const query = params.toString();
    return query ? `${base}?${query}` : base;
  }

  async execute(): Promise<QueryResult<T | T[]>> {
    try {
      const res = await fetch(this.buildUrl(), {
        method: this._method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: this._body ? JSON.stringify(this._body) : undefined,
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {
          message?: string;
        };

        return { data: null, error: err.message ?? `HTTP ${res.status}` };
      }

      if (res.status === 204) return { data: null, error: null };

      const data = (await res.json()) as T | T[];

      return { data, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network Error";

      return { data: null, error: message };
    }
  }
  then<TResult1 = QueryResult<T | T[]>, TResult2 = never>(
    onfulfilled?:
      | ((value: QueryResult<T | T[]>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}
