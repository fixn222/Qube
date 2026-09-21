import {
  All,
  Body,
  Controller,
  Delete,
  Get,
  Next,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';

import type { NextFunction, Request, Response } from 'express';

import { IsNumber, IsString } from 'class-validator';
import { PROJECT_KEY_ROLE } from '@qube/constants';
import { createRouteHandler } from 'uploadthing/express';
import { StorageService } from './storage.service';
import { storageRouter } from './uploadthing';
import {
  ProjectKeyGuard,
  type ProjectKeyPayload,
} from '../project-api/project-key.guard';
import { ForbiddenException } from '@nestjs/common';

class SaveObjectDto {
  @IsString()
  name!: string;

  @IsNumber()
  size!: number;

  @IsString()
  utKey!: string;

  @IsString()
  url!: string;

  @IsString()
  type!: string;
}

const utHandler = createRouteHandler({ router: storageRouter });

@Controller('projects/:projectSlug/storage')
@UseGuards(ProjectKeyGuard)
export class ProjectStorageController {
  constructor(private storage: StorageService) {}

  private getProjectKey(req: Request): ProjectKeyPayload {
    return req['projectKey'] as ProjectKeyPayload;
  }

  private assertWriteAccess(req: Request): void {
    const { role } = this.getProjectKey(req);

    if (role !== PROJECT_KEY_ROLE.SERVICE_ROLE) {
      throw new ForbiddenException(
        `Write operations require the service role key`,
      );
    }
  }
  @Get('buckets/:bucketName/objects')
  async getObjects(
    @Req() req: Request,
    @Param('projectSlug') projectSlug: string,
    @Param('bucketName') bucketName: string,
  ) {
    const { projectId } = this.getProjectKey(req);
    await this.storage.assertProjetSlug(projectId, projectSlug);
    const bucket = await this.storage.getBucketByName(projectId, bucketName);
    return this.storage.getObjects(bucket.id);
  }
  @All('/buckets/:bucketName/upload')
  async handleUpload(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
    @Param('projectSlug') projectSlug: string,
    @Param('bucketName') bucketName: string,
  ): Promise<void> {
    const { projectId } = this.getProjectKey(req);

    await this.storage.assertProjetSlug(projectId, projectSlug);

    await this.storage.getBucketByName(projectId, bucketName);

    const originalUrl = req.url;
    const queryIndex = originalUrl.indexOf('?');
    const query = queryIndex >= 0 ? originalUrl.slice(queryIndex) : '';

    req.url = `/${query}`;

    utHandler(req, res, (err?: unknown) => {
      req.url = originalUrl;
      if (err) next(err);
    });
  }

  @Post('buckets/:bucketName/objects')
  async saveObject(
    @Req() req: Request,
    @Param('projectSlug') projectSlug: string,
    @Param('bucketName') bucketName: string,
    @Body() file: SaveObjectDto,
  ) {
    this.assertWriteAccess(req);

    const { projectId } = this.getProjectKey(req);

    await this.storage.assertProjetSlug(projectId, projectSlug);

    const bucket = await this.storage.getBucketByName(projectId, bucketName);

    return this.storage.saveObject(bucket.id, file);
  }

  @Delete('objects/:objectId')
  async deleteObject(
    @Req() req: Request,
    @Param('projectSlug') projectSlug: string,
    @Param('objectId') objectId: string,
  ) {
    this.assertWriteAccess(req);
    const { projectId } = this.getProjectKey(req);
    await this.storage.assertProjetSlug(projectId, projectSlug);
    return this.storage.deleteObject(objectId);
  }

  @Get('objects/:objectId/signed-url')
  async getSignedUrl(
    @Req() req: Request,
    @Param('projectSlug') projectSlug: string,
    @Param('objectId') objectId: string,
  ) {
    const { projectId } = this.getProjectKey(req);
    await this.storage.assertProjetSlug(projectId, projectSlug);
    return this.storage.getSignedUrl(objectId);
  }
}
