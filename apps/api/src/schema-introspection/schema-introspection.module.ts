import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgRoleGuard } from '../auth/guards/orgRole.guard';
import { SchemaIntrospectionController } from './schema-introspection.controller';
import { SchemaIntrospectionService } from './schema-introspection.service';

@Module({
  imports: [AuthModule],
  controllers: [SchemaIntrospectionController],
  providers: [OrgRoleGuard, SchemaIntrospectionService],
})
export class SchemaIntrospectionModule {}
