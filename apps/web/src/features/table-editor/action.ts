"use server";

import { tableEditorServerSchema } from "./server.schema";
import { COOKIE_KEYS, TABLE_EDITOR_INTENT } from "@qube/constants";
import apiClient from "@/lib/axios";
import type { TableInfo } from "@qube/types";
import { retriveTokenFromCookies } from "@/server-utils/utils";

export type TableEditorActionState = {
  error?: string;
  success?: string;
  tableName?: string;
  tableData?: {
    info: TableInfo;
    rows: Record<string, unknown>[];
    count: number;
  };
};        

type TableEditorContext = {
  orgSlug: string;
  projectSlug: string;
};

function authHeaders(token: string) {
  return { headers: { Cookie: `${COOKIE_KEYS.ACCESS_TOKEN}=${token}` } };
}

function basePath(orgSlug: string, projectSlug: string) {
  return `/orgs/${orgSlug}/projects/${projectSlug}/tables`;
}



export async function tableEditorAction(
  { orgSlug, projectSlug }: TableEditorContext,
  _prev: TableEditorActionState,
  formData: FormData,
): Promise<TableEditorActionState> {
  const raw = Object.fromEntries(formData);
  const parsed = tableEditorServerSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors[0] ?? "Invalid input" };
  }

  const token = await retriveTokenFromCookies();
  const { intent } = parsed.data;
  const base = basePath(orgSlug, projectSlug);
  const opts = authHeaders(token);

  try {
    switch (intent) {
      case TABLE_EDITOR_INTENT.CREATE_TABLE: {
        const { name, columns } = parsed.data;
        await apiClient.post(base, { name, columns }, opts);
     return { success: "Table created!", tableName: name };
      }

      case TABLE_EDITOR_INTENT.DELETE_TABLE: {
        const { tableName } = parsed.data;
        await apiClient.delete(`${base}/${tableName}`, opts);

        return { success: "Table deleted!", tableName };
      }

      case TABLE_EDITOR_INTENT.FETCH_TABLE: {
        const { tableName } = parsed.data;
        const [infoRes, rowsRes] = await Promise.all([
          apiClient.get<TableInfo>(`${base}/${tableName}`, opts),
          apiClient.get<{ rows: Record<string, unknown>[]; count: number }>(
            `${base}/${tableName}/rows?limit=100`,
            opts,
          ),
        ]);
        return {
          tableData: {
            info: infoRes.data,
            rows: rowsRes.data.rows,
            count: rowsRes.data.count,
          },
        };
      }

      case TABLE_EDITOR_INTENT.ADD_COLUMN: {
        const { tableName, name, type, defaultValue } = parsed.data;
        await apiClient.patch(
          `${base}/${tableName}/columns`,
          { name, type, defaultValue: defaultValue || undefined },
          opts,
        );
        return { success: "Column added!", tableName };
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    return { error: err.response?.data?.message ?? "Something went wrong" };
  }
}
