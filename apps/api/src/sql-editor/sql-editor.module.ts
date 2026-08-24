import { Module } from '@nestjs/common';
import { SqlEditorService } from './sql-editor.service';
import { SqlEditorController } from './sql-editor.controller';
import { AuthModule } from '../auth/auth.module';
import { OrgRoleGuard } from '../auth/guards/orgRole.guard';

@Module({
  imports: [AuthModule],
  providers: [SqlEditorService, OrgRoleGuard],
  controllers: [SqlEditorController],
})
export class SqlEditorModule {}