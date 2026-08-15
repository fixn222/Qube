import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgRoleGuard } from '../auth/guards/orgRole.guard';
import { TableEditorService } from './table-editor.service';
import { TableEditorController } from './table.controller';

@Module({
  imports: [AuthModule],
  providers: [TableEditorService, OrgRoleGuard],
  controllers: [TableEditorController],
})
export class TableEditorModule {}