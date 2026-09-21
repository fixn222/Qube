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
import { createRouteHandler } from 'uploadthing/express';
import { IsNumber, IsEnum, IsString } from 'class-validator';
import { StorageService } from './storage.service';
import { storageRouter } from './uploadthing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrgRoleGuard } from '../auth/guards/orgRole.guard';
import type { BucketAccess } from '@qube/types';

class CreateBucketDto {
  @IsString()
  name!: string;

  @IsEnum(['public', 'private'])
  access!: BucketAccess;
}

class SaveObjectDto {
  @IsString()
  name!: string;

  @IsNumber()
  size!: number;

  @IsString()
  type!: string;

  @IsString()
  utKey!: string;

  @IsString()
  url!: string;
}

const utHandler = createRouteHandler({ router: storageRouter });

@Controller('orgs/:slug/projects/:projectSlug/storage')
@UseGuards(JwtAuthGuard, OrgRoleGuard)
export class StorageController {
  constructor(private storageService: StorageService) {}

  @Get('buckets')
  getBuckets(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
  ) {
    return this.storageService.getBuckets(slug, projectSlug);
  }

  @Post('buckets')
  createBucket(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Body() dto: CreateBucketDto,
  ) {
    return this.storageService.createBucket(
      slug,
      projectSlug,
      dto.name,
      dto.access,
    );
  }

  @Delete('buckets/:bucketId')
  deleteBucket(@Param('bucketId') bucketId: string) {
    return this.storageService.deleteBuckets(bucketId);
  }

  @Get('buckets/:bucketId/objects')
  getObjects(@Param('bucketId') bucketId: string) {
    return this.storageService.getObjects(bucketId);
  }

  // UploadThing upload endpoint — proxies the UT protocol (GET + POST)
  @All('buckets/:bucketId/upload')
  handleUpload(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ): void {
    const originalUrl = req.url;
    const queryIndex = originalUrl.indexOf('?');
    const query = queryIndex >= 0 ? originalUrl.slice(queryIndex) : '';
    req.url = `/${query}`;
    utHandler(req, res, (err?: unknown) => {
      req.url = originalUrl;
      if (err) next(err);
    });
  }

  @Post('buckets/:bucketId/objects')
  saveObject(@Param('bucketId') bucketId: string, @Body() file: SaveObjectDto) {
    return this.storageService.saveObject(bucketId, file);
  }

  @Delete('objects/:objectId')
  deleteObject(@Param('objectId') objectId: string) {
    return this.storageService.deleteObject(objectId);
  }

  @Get('objects/:objectId/signed-url')
  getSignedUrl(@Param('objectId') objectId: string) {
    return this.storageService.getSignedUrl(objectId);
  }
}
