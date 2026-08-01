"use server";

import { redirect } from "next/navigation";
import { authServerSchema } from "./server.schema";
import { AUTH_INTENT } from "./constants";
import { applyAuthCookiesFromResponse } from "./cookies";

export type AuthActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function authAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const raw = Object.fromEntries(formData);
  const parsed = authServerSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const { intent, ...data } = parsed.data;

  let res: Response;

  switch (intent) {
    case AUTH_INTENT.LOGIN: {
      res = await fetch(`${process.env.API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json();
        return { error: body.message ?? "Login failed" };
      }

      break;
    }

    case AUTH_INTENT.REGISTER: {
      res = await fetch(`${process.env.API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json();
        return { error: body.message ?? "Registration failed" };
      }

      break;
    }
  }

  await applyAuthCookiesFromResponse(res);
  redirect("/dashboard");
}
