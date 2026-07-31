export const AUTH_INTENT = {
  LOGIN: "LOGIN",
  REGISTER: "REGISTER",
} as const;

export type AuthIntent = (typeof AUTH_INTENT)[keyof typeof AUTH_INTENT];
