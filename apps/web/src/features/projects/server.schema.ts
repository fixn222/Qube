import {z} from 'zod'
import { PROJECT_INTENT } from './constants';
import { createProjectScema } from './client.schema';

export const ProjectServerSchema = z.discriminatedUnion('intent' ,[
    z.object({
        intent : z.literal(PROJECT_INTENT.CREATE), 
        ...createProjectScema.shape
    })
]);