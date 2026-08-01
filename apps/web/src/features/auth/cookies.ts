import { COOKIE_KEYS } from "@qube/constants";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

type ParsedCookie = {
  name: string;
  value: string;
  options: {
    path: string;
    maxAge?: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: "lax" | "strict" | "none";
  };
};

export function parseSetCookieHeader(setCookie: string): ParsedCookie {
  const parts = setCookie.split(";").map((part) => part.trim());
  const [nameValue, ...attributes] = parts;

  const separatorIndex = nameValue.indexOf("=");
  const name = nameValue.slice(0, separatorIndex);
  const value = nameValue.slice(separatorIndex + 1);

  const options: ParsedCookie["options"] = {
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "lax",
  };

  for (const attribute of attributes) {
    const separator = attribute.indexOf("=");
    const key = (
      separator === -1 ? attribute : attribute.slice(0, separator)
    ).toLowerCase();
    const val = separator === -1 ? "" : attribute.slice(separator + 1);

    switch (key) {
      case "path":
        options.path = val;
        break;
      case "max-age":
        options.maxAge = Number.parseInt(val, 10);
        break;
      case "httponly":
        options.httpOnly = true;
        break;
      case "secure":
        options.secure = true;
        break;
      case "samesite":
        options.sameSite =
          val.toLowerCase() as ParsedCookie["options"]["sameSite"];
        break;
    }
  }

  return { name, value, options };
}

function isAuthCookie(name: string) {
  return (
    name === COOKIE_KEYS.ACCESS_TOKEN || name === COOKIE_KEYS.REFRESH_TOKEN
  );
}

export async function applyAuthCookiesFromResponse(response: Response) {
  const cookieStore = await cookies();
  for (const header of response.headers.getSetCookie()) {
    const parsed = parseSetCookieHeader(header);
    if (!isAuthCookie(parsed.name)) continue;
    cookieStore.set(parsed.name, parsed.value, parsed.options);
  }
}

export function applyAuthCookiesToResponse(
  response: NextResponse,
  setCookieHeaders: string[],
) {
  for (const header of setCookieHeaders) {
    const parsed = parseSetCookieHeader(header);
    if (!isAuthCookie(parsed.name)) continue;
    response.cookies.set(parsed.name, parsed.value, parsed.options);
  }
}
