import { BadRequestException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { v4 as uuidv4 } from 'uuid';

export interface UploadedImage {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export function configureCloudinary(): void {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

/**
 *
 * @param folder        
 * @param originalName  
 */
export function generatePublicId(folder: string, originalName: string): string {
  const sanitized  = originalName
    .replace(/\.[^/.]+$/, '')          
    .replace(/[^a-zA-Z0-9_-]/g, '_')  
    .toLowerCase();
  const timestamp  = Date.now();
  const unique     = uuidv4().replace(/-/g, '').slice(0, 8);
  return `${folder}/${sanitized}_${timestamp}_${unique}`;
}

/**
 *
 * @param buffer        
 * @param folder       
 * @param originalName 
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  folder: string,
  originalName: string = 'file',
): Promise<UploadedImage> {
  const publicId = generatePublicId(folder, originalName);

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id: publicId, resource_type: 'image' },
      (error, result: UploadApiResponse | undefined) => {
        if (error || !result) {
          reject(
            new BadRequestException(
              error?.message ?? 'Cloudinary upload failed',
            ),
          );
          return;
        }
        resolve({
          url:      result.secure_url,
          publicId: result.public_id,
          width:    result.width,
          height:   result.height,
          format:   result.format,
          bytes:    result.bytes,
        });
      },
    );
    stream.end(buffer);
  });
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}