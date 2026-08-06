import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ProjectService } from './create-projects.service';
import { ProjectsController } from './projects.controller';

@Module({
  imports: [JwtModule.register({})],
  providers: [ProjectService],
  controllers: [ProjectsController],
  exports: [ProjectService],
})
export class ProjectsModule {}