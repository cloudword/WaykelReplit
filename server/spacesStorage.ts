import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { Readable } from "stream";
import { Response } from "express";
import { randomUUID } from "crypto";

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

interface SpacesConfig {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region?: string;
}

function getSpacesConfig(): SpacesConfig | null {
  // Support both DO_SPACES_* and SPACES_* naming conventions
  const endpoint = process.env.DO_SPACES_ENDPOINT || process.env.SPACES_ENDPOINT;
  const accessKeyId = process.env.DO_SPACES_KEY || process.env.SPACES_KEY;
  const secretAccessKey = process.env.DO_SPACES_SECRET || process.env.SPACES_SECRET;
  const bucket = process.env.DO_SPACES_BUCKET || process.env.SPACES_BUCKET;

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    return null;
  }

  return {
    endpoint: endpoint.startsWith("https://") ? endpoint : `https://${endpoint}`,
    accessKeyId,
    secretAccessKey,
    bucket,
    region: process.env.DO_SPACES_REGION || process.env.SPACES_REGION || "nyc3",
  };
}

function createS3Client(config: SpacesConfig): S3Client {
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: false,
  });
}

export class SpacesStorageService {
  private client: S3Client;
  private bucket: string;
  private endpoint: string;

  constructor() {
    const config = getSpacesConfig();
    if (!config) {
      throw new Error(
        "DigitalOcean Spaces not configured. Set DO_SPACES_ENDPOINT, DO_SPACES_KEY, DO_SPACES_SECRET, and DO_SPACES_BUCKET environment variables."
      );
    }
    this.client = createS3Client(config);
    this.bucket = config.bucket;
    this.endpoint = config.endpoint;
  }

  static isConfigured(): boolean {
    return getSpacesConfig() !== null;
  }

  getPrivateObjectDir(): string {
    return process.env.PRIVATE_OBJECT_DIR || "private";
  }

  getPublicObjectDir(): string {
    return process.env.PUBLIC_OBJECT_DIR || "public";
  }

  async uploadFile(
    buffer: Buffer,
    originalFilename: string,
    contentType: string,
    directory: string = "uploads",
    isPublic: boolean = false
  ): Promise<{ key: string; url: string }> {
    const ext = originalFilename.split(".").pop() || "";
    const key = `${directory}/${randomUUID()}.${ext}`;

    try {
      const upload = new Upload({
        client: this.client,
        params: {
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          ACL: isPublic ? "public-read" : "private",
        },
      });

      await upload.done();
    } catch (error: any) {
      console.error('Upload failed:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    const url = isPublic
      ? `${this.endpoint}/${this.bucket}/${key}`
      : key;

    return { key, url };
  }

  async uploadPrivateFile(
    buffer: Buffer,
    originalFilename: string,
    contentType: string,
    subDirectory?: string
  ): Promise<{ key: string }> {
    const dir = subDirectory
      ? `${this.getPrivateObjectDir()}/${subDirectory}`
      : this.getPrivateObjectDir();

    const { key } = await this.uploadFile(buffer, originalFilename, contentType, dir, false);
    return { key };
  }

  async uploadPublicFile(
    buffer: Buffer,
    originalFilename: string,
    contentType: string,
    subDirectory?: string
  ): Promise<{ key: string; url: string }> {
    const dir = subDirectory
      ? `${this.getPublicObjectDir()}/${subDirectory}`
      : this.getPublicObjectDir();

    return this.uploadFile(buffer, originalFilename, contentType, dir, true);
  }

  async getObject(key: string): Promise<{ body: Readable; contentType: string; contentLength: number }> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.client.send(command);

      if (!response.Body) {
        throw new ObjectNotFoundError();
      }

      return {
        body: response.Body as Readable,
        contentType: response.ContentType || "application/octet-stream",
        contentLength: response.ContentLength || 0,
      };
    } catch (error: any) {
      if (error.name === "NoSuchKey" || error.$metadata?.httpStatusCode === 404) {
        throw new ObjectNotFoundError();
      }
      throw error;
    }
  }

  async downloadObject(key: string, res: Response, cacheTtlSec: number = 3600): Promise<void> {
    try {
      const { body, contentType, contentLength } = await this.getObject(key);

      res.set({
        "Content-Type": contentType,
        "Content-Length": contentLength.toString(),
        "Cache-Control": `private, max-age=${cacheTtlSec}`,
      });

      body.pipe(res);
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        res.status(404).json({ error: "File not found" });
      } else {
        console.error("Error downloading file:", error);
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  async deleteObject(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
    } catch (error: any) {
      if (error.name !== "NoSuchKey" && error.$metadata?.httpStatusCode !== 404) {
        throw error;
      }
    }
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  async listObjects(prefix: string, maxKeys: number = 100): Promise<string[]> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
      MaxKeys: maxKeys,
    });

    const response = await this.client.send(command);
    return (response.Contents || []).map((obj) => obj.Key || "").filter(Boolean);
  }

  getPublicUrl(key: string): string {
    const encodedKey = key
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    return `${this.endpoint}/${this.bucket}/${encodedKey}`;
  }

  async getSignedUrl(key: string, expiresInSeconds: number = 3600): Promise<string> {
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }
}

let spacesStorageInstance: SpacesStorageService | null = null;

export function getSpacesStorage(): SpacesStorageService | null {
  if (!SpacesStorageService.isConfigured()) {
    return null;
  }

  if (!spacesStorageInstance) {
    spacesStorageInstance = new SpacesStorageService();
  }

  return spacesStorageInstance;
}

export interface DocumentStorageContext {
  entityType: "driver" | "vehicle" | "transporter" | "customer" | "trip";
  transporterId?: string | null;
  vehicleId?: string;
  userId?: string;
  customerId?: string;
  rideId?: string;
}

export function getDocumentStoragePath(context: DocumentStorageContext): string {
  const { entityType, transporterId, vehicleId, userId, customerId, rideId } = context;

  switch (entityType) {
    case "transporter":
      if (!transporterId) throw new Error("transporterId required for transporter documents");
      return `transporters/${transporterId}/documents`;

    case "driver":
      if (!transporterId) throw new Error("transporterId required for driver documents");
      if (!userId) throw new Error("userId required for driver documents");
      return `transporters/${transporterId}/drivers/${userId}`;

    case "vehicle":
      if (!transporterId) throw new Error("transporterId required for vehicle documents");
      if (!vehicleId) throw new Error("vehicleId required for vehicle documents");
      return `transporters/${transporterId}/vehicles/${vehicleId}`;

    case "customer":
      if (!customerId && !userId) throw new Error("customerId or userId required for customer documents");
      return `customers/${customerId || userId}/documents`;

    case "trip":
      if (!rideId) throw new Error("rideId required for trip documents");
      const tripPath = `trips/${rideId}`;
      if (transporterId) return `${tripPath}/transporter`;
      if (customerId) return `${tripPath}/customer`;
      return tripPath;

    default:
      return "documents/misc";
  }
}
