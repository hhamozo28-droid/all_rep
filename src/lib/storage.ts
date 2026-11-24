import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from "@aws-sdk/lib-storage";

/**
 * Private object storage for every downloadable file. Credentials are read
 * only on the server and never reach the browser. When S3 is not configured
 * the older GitHub/GoFile paths remain available for backward compatibility.
 */

const SIGNED_URL_SECONDS = 30;

let cachedClient: S3Client | null = null;

function config() {
  const region = process.env.AWS_REGION?.trim();
  const bucket = process.env.S3_BUCKET?.trim();
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  if (!region || !bucket || !accessKeyId || !secretAccessKey) return null;
  return { region, bucket, accessKeyId, secretAccessKey };
}

export function isS3Configured(): boolean {
  return config() !== null;
}

function client(): S3Client {
  const cfg = config();
  if (!cfg) throw new Error("S3 storage is not configured");
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: cfg.region,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
    });
  }
  return cachedClient;
}

function fullKey(key: string): string {
  const prefix = (process.env.S3_KEY_PREFIX ?? "dordoc").replace(/^\/+|\/+$/g, "");
  const clean = key.replace(/^\/+/, "");
  return prefix ? `${prefix}/${clean}` : clean;
}

export function fileSha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  await client().send(
    new PutObjectCommand({
      Bucket: config()!.bucket,
      Key: fullKey(key),
      Body: body,
      ContentType: contentType,
      ServerSideEncryption: "AES256",
    }),
  );
}

/** Multipart upload for large files (the specialty catalog reaches 273MB). */
export async function uploadFileToS3(
  key: string,
  localPath: string,
  contentType: string,
): Promise<void> {
  await new Upload({
    client: client(),
    params: {
      Bucket: config()!.bucket,
      Key: fullKey(key),
      Body: createReadStream(localPath),
      ContentType: contentType,
      ServerSideEncryption: "AES256",
    },
    queueSize: 4,
    partSize: 8 * 1024 * 1024,
    leavePartsOnError: false,
  }).done();
}

export async function getObject(key: string): Promise<Buffer | null> {
  try {
    const result = await client().send(
      new GetObjectCommand({ Bucket: config()!.bucket, Key: fullKey(key) }),
    );
    if (!result.Body) return null;
    const bytes = await result.Body.transformToByteArray();
    return Buffer.from(bytes);
  } catch (error) {
    console.error("S3 getObject failed", error);
    return null;
  }
}

export async function deleteObject(key: string): Promise<void> {
  await client().send(
    new DeleteObjectCommand({ Bucket: config()!.bucket, Key: fullKey(key) }),
  );
}

export async function signedObjectUrl(
  key: string,
  fileName: string,
  contentType: string,
): Promise<string> {
  const disposition = `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`;
  return getSignedUrl(
    client(),
    new GetObjectCommand({
      Bucket: config()!.bucket,
      Key: fullKey(key),
      ResponseContentDisposition: disposition,
      ResponseContentType: contentType,
    }),
    { expiresIn: SIGNED_URL_SECONDS },
  );
}

export const storageHeaders: Record<string, string> = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};
