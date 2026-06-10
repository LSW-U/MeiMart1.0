export type UploadResult = {
  url: string;
};

export async function uploadFile(uri: string): Promise<UploadResult> {
  return { url: uri };
}
