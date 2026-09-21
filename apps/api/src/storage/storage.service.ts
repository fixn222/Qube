import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { and, eq } from 'drizzle-orm';
import { UTApi } from 'uploadthing/server';
import { DrizzleService } from 'src/db/drizzle.service';
import {
  projects,
  organizations,
  storageBuckets,
  storageObjects,
} from '../db/schema';
import type { BucketAccess } from '@qube/types';

@Injectable()
export class StorageService {
  private utApi = new UTApi();

  constructor(private drizzle: DrizzleService) {}

  private async getProject(orgSlug: string, projectSlug: string) {
    const [row] = await this.drizzle.db
      .select({ id: projects.id })
      .from(projects)
      .innerJoin(organizations, eq(projects.orgId, organizations.id))
      .where(
        and(eq(organizations.slug, orgSlug), eq(projects.slug, projectSlug)),
      )
      .limit(1);

    if (!row) throw new NotFoundException(`Project Not Found`);

    return row;
  }

  async getBuckets(orgSlug: string, projectSlug: string) {
    const project = await this.getProject(orgSlug, projectSlug);

    return this.drizzle.db
      .select()
      .from(storageBuckets)
      .where(eq(storageBuckets.projectId, project.id));
  }
  async createBucket(
    orgSlug: string,
    projectSlug: string,
    name: string,
    access: BucketAccess,
  ) {
    const project = await this.getProject(orgSlug, projectSlug);

    const trimmed = name.trim();

    if (!trimmed) {
      throw new BadRequestException(`Bucket name is Required`);
    }

    const [bucket] = await this.drizzle.db
      .insert(storageBuckets)
      .values({ projectId: project.id, name: trimmed, access })
      .returning();

    return bucket;
  }

  async deleteBuckets(bucketId: string) {
    const objects = await this.drizzle.db
      .select({ utKey: storageObjects.utKey })
      .from(storageObjects)
      .where(eq(storageObjects.bucketId, bucketId));

    if (objects.length > 0) {
      await this.utApi.deleteFiles(objects.map((o) => o.utKey));
    }

    await this.drizzle.db
      .delete(storageBuckets)
      .where(eq(storageObjects.bucketId, bucketId));

    return { message: 'Bucket deleted' };
  }

  async getObjects(bucketId: string) {
    return this.drizzle.db
      .select()
      .from(storageObjects)
      .where(eq(storageObjects.bucketId, bucketId));
  }

  async saveObject(
    bucketId: string,
    file: {
      name: string;
      size: number;
      type: string;
      utKey: string;
      url: string;
    },
  ) {
    const [bucket] = await this.drizzle.db
      .select()
      .from(storageBuckets)
      .where(eq(storageBuckets.id, bucketId))
      .limit(1);

    if (!bucket) throw new NotFoundException(`Bucket Not found`);

    const url = bucket.access === 'public' ? file.url : '';

    const [object] = await this.drizzle.db
      .insert(storageObjects)
      .values({
        bucketId,
        name: file.name,
        mimeType: file.type,
        size: file.size,
        utKey: file.utKey,
        url,
      })
      .returning();

    return object;
  }

  async deleteObject(objectId: string) {
    const [object] = await this.drizzle.db
      .select()
      .from(storageObjects)
      .where(eq(storageObjects.id, objectId))
      .limit(1);

    if (!object) throw new NotFoundException('File not found');

    await this.utApi.deleteFiles(object.utKey);

    await this.drizzle.db
      .delete(storageObjects)
      .where(eq(storageObjects.id, objectId));

    return { message: 'File deleted' };
  }

  async getSignedUrl(objectId: string) {
    const [object] = await this.drizzle.db
      .select()
      .from(storageObjects)
      .where(eq(storageObjects.id, objectId))
      .limit(1);

    if (!object) throw new NotFoundException('File not found');

    const { ufsUrl } = await this.utApi.generateSignedURL(object.utKey, {
      expiresIn: 3600,
    });

    return { url: ufsUrl };
  }

  async assertProjetSlug(
    projectId: string,
    projectSlug: string,
  ): Promise<void> {
    const [project] = await this.drizzle.db
      .select({
        slug: projects.slug,
      })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) throw new NotFoundException(`project not found`);

    if (project.slug !== projectSlug) {
      throw new ForbiddenException('API key does not match this project URL');
    }
  }

  async getBucketByName(projectId: string, bucketName: string) {
    const [bucket] = await this.drizzle.db
      .select()
      .from(storageBuckets)
      .where(
        and(
          eq(storageBuckets.projectId, projectId),
          eq(storageBuckets.name, bucketName),
        ),
      )
      .limit(1);

    if (!bucket) throw new NotFoundException('Bucket not found');

    return bucket;
  }
}
