import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { AuthModule } from '../auth/auth.module';
import { ProjectStorageController } from './project-storage.controller';
import { JwtModule } from '@nestjs/jwt';
import { ProjectKeyGuard } from 'src/project-api/project-key.guard';

@Module({
  imports: [AuthModule, JwtModule.register({})],
  providers: [StorageService, ProjectKeyGuard],
  controllers: [StorageController, ProjectStorageController],
})
export class StorageModule {}
