import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MemberService } from './member.service';
import { InviteService } from './invite.service';
import { MembersController } from './members.controller';

@Module({
  imports: [JwtModule.register({})],
  providers: [MemberService, InviteService],
  controllers: [MembersController],
  exports: [InviteService],
})
export class MembersModule {}