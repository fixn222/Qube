export const MEMBERS_INTENT ={
    INVITE : 'INVITE' ,
    UPDATE_ROLE : 'UPDATE_ROLE' ,
    REMOVE : 'REMOVE'
} as const;





export type MembersIntent = (typeof MEMBERS_INTENT)[keyof typeof MEMBERS_INTENT];