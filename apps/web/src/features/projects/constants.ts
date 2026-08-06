export const PROJECT_INTENT = {
    CREATE   :"CREATE"
} as const;


export type ProjectIntent = (typeof PROJECT_INTENT)[keyof typeof PROJECT_INTENT];