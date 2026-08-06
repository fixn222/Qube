import { IsEmail, IsEnum } from "class-validator";

export class InviteMemberDto {
    @IsEmail()
    email! : string 
}