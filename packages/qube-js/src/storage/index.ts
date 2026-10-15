
import { genUploader } from 'uploadthing/client'
import type { StorageObject } from '../types'


type StorageUploadRouter = {
  bucketUploader: {
    input: undefined;
    output: null;
  }
};


export interface StorageResult<T> {
  data: T | null;
  error: string | null;
}




async function apiFetch<T>(
  url: string,
  apiKey: string,
  init?: RequestInit,): Promise<StorageResult<T>> {

  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      }
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as {
        message?: string
      }
      return { data: null, error: err.message ?? `HTTP ${res.status}` };
    }

    if (res.status === 204) return { data: null, error: null };

    const data = (await res.json()) as T;

    return { data, error: null }
  } catch (err: unknown) {

    const message = err instanceof Error ? err.message : 'Network Error';
    return { data: null, error: message };

  }
}




export class StorageBucketRef {
  constructor(
    private _projectUrl: string,
    private _apiKey: string,
    private _bucketName: string
  ) { };


  private storageBase(): string {
    const bucket = encodeURIComponent(this._bucketName);
    return `${this._projectUrl.replace(/\/$/, "")}/storage/buckets/${bucket}`;
  }


  async list(): Promise<StorageResult<StorageObject[]>> {
    return apiFetch<StorageObject[]>(
      `${this.storageBase()}/objects`,
      this._apiKey
    );


  }


  async upload(file: File): Promise<StorageResult<StorageObject>> {
    try {

      const uploadUrl = `${this.storageBase()}/upload`;

      const { uploadFiles } = genUploader({
        url: uploadUrl,
      });


      const uploaded = await uploadFiles('bucketUploader', {
        files: [file],
        headers: { Authorization: `Bearer ${this._apiKey}` }
      });

      const utFile = uploaded[0];

      if (!utFile) {
        return { data: null, error: "Upload returned no files" };
      }


      return apiFetch<StorageObject>(
        `${this.storageBase()}/objects`,
        this._apiKey,
        {
          method: "POST",
          body: JSON.stringify({
            name: utFile.name,
            size: utFile.size,
            type: utFile.type || "application/octet-stream",
            utKey: utFile.key,
            url: utFile.url,
          })

        }
      )


    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload Failed";
      return { data: null, error: message };
    }
  }



  async remove(objectId: string): Promise<StorageResult<{ message: string }>> {
    return apiFetch<{ message: string }>(
      `${this._projectUrl.replace(/\/$/, "")}/storage/objects/${encodeURIComponent(objectId)}`,
      this._apiKey,
      { method: 'DELETE' },
    );
  }

  async getSignedUrl(
    objectId: string,
  ): Promise<StorageResult<{ url: string }>> {
    return apiFetch<{ url: string }>(
      `${this._projectUrl.replace(/\/$/, "")}/storage/objects/${encodeURIComponent(objectId)}/signed-url`,
      this._apiKey,
    );
  }
}

export class QubeStorage {
  constructor(
    private projectUrl: string,
    private apiKey: string,
  ) { }

  from(bucketName: string): StorageBucketRef {
    return new StorageBucketRef(this.projectUrl, this.apiKey, bucketName);
  }
}




