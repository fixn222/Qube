export const ORGANIZATION_INTENT = {
  CREATE: 'CREATE',
} as const;

export type OrganizationIntent =
  (typeof ORGANIZATION_INTENT)[keyof typeof ORGANIZATION_INTENT];
