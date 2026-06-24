import { api } from './api';

export type UploadResult = {
  url: string;
};

export async function uploadFile(uri: string): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', {
    uri,
    type: 'image/jpeg',
    name: 'upload.jpg',
  });

  const res = await api.post<UploadResult>('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}
