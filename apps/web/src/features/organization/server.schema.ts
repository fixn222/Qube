import { z } from 'zod';
import { ORGANIZATION_INTENT } from './constants';
import { createOrganizationSchema } from './client.schema';

export const OrganizationServerSchema = z.discriminatedUnion('intent', [
  z.object({
    intent: z.literal(ORGANIZATION_INTENT.CREATE),
    ...createOrganizationSchema.shape,
  }),
]);
