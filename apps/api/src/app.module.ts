import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from './db/db.module';
import { AuthModule } from './auth/auth.module';
import { OrgsModule } from './orgs/org.module';
import { MembersModule } from './members/members.module';
import { ProjectsModule } from './projects/projects.module';
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }),
    DbModule,
    AuthModule,
    OrgsModule,
    MembersModule ,
  ProjectsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
