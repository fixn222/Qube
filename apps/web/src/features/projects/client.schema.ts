import {z} from 'zod'
import type { CreateProjectInput } from '@qube/types'
 

export const createProjectScema = z.object({
    name : z.string()
    .min(2 , 'Name must have at least 2 characters')
    .max(50 ,'Name must be at most 50 characters')
}) satisfies z.ZodType<CreateProjectInput>;



