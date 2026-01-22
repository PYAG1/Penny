import { put, del } from '@vercel/blob';
import { nanoid } from 'nanoid';

export const blobStorageService = {
  /**
   * Upload an image to Vercel Blob storage
   */
  async uploadImage(buffer: Buffer, contentType: string): Promise<string> {
    const extension = contentType.split('/')[1] || 'png';
    const filename = `screenshots/${nanoid()}.${extension}`;

    const blob = await put(filename, buffer, {
      access: 'public',
      contentType,
    });

    return blob.url;
  },


  async uploadPdf(buffer: Buffer, filename: string): Promise<string> {
    const blob = await put(`documents/${filename}`, buffer, {
      access: 'public',
      contentType: 'application/pdf',
    });
    return blob.url;
  },

  async uploadFile(buffer: Buffer, filename: string, contentType: string): Promise<string> {
    const folder = contentType.startsWith('image/') ? 'images' : 'documents';
    const blob = await put(`${folder}/${filename}`, buffer, {
      access: 'public',
      contentType,
    });
    return blob.url;
  },

  /**
   * Delete an image from Vercel Blob storage
   */
  async deleteImage(url: string): Promise<void> {
    await del(url);
  },
};
