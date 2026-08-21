import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from './db/db.module';
import { AuthModule } from './auth/auth.module';
import { OrgsModule } from './orgs/org.module';
import { MembersModule } from './members/members.module';
import { ProjectsModule } from './projects/projects.module';
import { TableEditorModule } from './table-editor/table-editor.module';
import { ProjectApiModule } from './project-api/project-api.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DbModule,
    AuthModule,
    OrgsModule,
    MembersModule,
    ProjectsModule,
    TableEditorModule,
    ProjectApiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
