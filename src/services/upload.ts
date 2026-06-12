import { request } from './api';

export type UploadResult = {
  url: string;
};

export async function uploadFile(uri: string): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', {
    uri,
    type: 'image/jpeg',
    name: 'upload.jpg',
  } as unknown as Blob);

  const res = await request<UploadResult>('/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'multipart/form-data' },
    body: formData as unknown as string,
  });
  return res;
}
