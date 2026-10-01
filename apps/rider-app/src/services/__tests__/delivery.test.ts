/**
 * 前端接线切换 T1-D4：deliveryApi 在线路径取证接线——
 * confirmPickup/confirmDelivery 的 evidence 先 uploadEvidenceCached 拿远端 URL，
 * 再随 taskApi body.evidenceUrls 上报；成功后清本地文件 + 回收 URL 缓存。
 */
import { deliveryApi } from '../delivery';
import { taskApi } from '../task';
import { deleteEvidenceFile, forgetUploadedUrl, uploadEvidenceCached } from '../evidence';

jest.mock('../api', () => ({ isMockMode: false }));
jest.mock('../task', () => ({
  taskApi: {
    pickup: jest.fn(),
    deliver: jest.fn(),
  },
}));
jest.mock('../evidence', () => ({
  uploadEvidenceCached: jest.fn(),
  deleteEvidenceFile: jest.fn(),
  forgetUploadedUrl: jest.fn(),
}));
jest.mock('../order', () => ({ orderApi: { add: jest.fn() } }));
jest.mock('../notification', () => ({ notificationApi: { add: jest.fn() } }));

const mockPickup = taskApi.pickup as jest.Mock;
const mockDeliver = taskApi.deliver as jest.Mock;
const mockUploadCached = uploadEvidenceCached as jest.Mock;

describe('前端接线切换 T1：deliveryApi 在线取证接线', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPickup.mockResolvedValue(undefined);
    mockDeliver.mockResolvedValue({ id: 'T1' });
  });

  it('confirmPickup：evidence 上传拿 URL 并入 body.evidenceUrls，成功后删文件+回收缓存', async () => {
    mockUploadCached.mockResolvedValue({ photoUri: 'https://cdn/p.jpg' });

    await deliveryApi.confirmPickup('T1', { photoUri: 'file://p/1.jpg' });

    expect(mockUploadCached).toHaveBeenCalledWith({ photoUri: 'file://p/1.jpg' });
    expect(mockPickup).toHaveBeenCalledWith('T1', {
      note: undefined,
      evidenceUrls: ['https://cdn/p.jpg'],
    });
    expect(deleteEvidenceFile).toHaveBeenCalledWith('file://p/1.jpg');
    expect(forgetUploadedUrl).toHaveBeenCalledWith('file://p/1.jpg');
  });

  it('confirmDelivery：URL 并入 deliver body.evidenceUrls（带 collectedAmount）', async () => {
    mockUploadCached.mockResolvedValue({ doorUri: 'https://cdn/s.png', packageUri: '' });

    await deliveryApi.confirmDelivery('T1', { doorUri: 'file://s/1.png', packageUri: '' }, 500);

    // 空串字段不上报（sync.ts 同款 filter 语义）
    expect(mockDeliver).toHaveBeenCalledWith('T1', {
      collectedAmount: 500,
      evidenceUrls: ['https://cdn/s.png'],
    });
    expect(deleteEvidenceFile).toHaveBeenCalledWith('file://s/1.png');
    expect(forgetUploadedUrl).toHaveBeenCalledWith('file://s/1.png');
  });

  it('无 evidence：不调上传、body.evidenceUrls 空数组、不删文件', async () => {
    await deliveryApi.confirmPickup('T1');
    await deliveryApi.confirmDelivery('T1', undefined, 100);

    expect(mockUploadCached).not.toHaveBeenCalled();
    expect(mockPickup).toHaveBeenCalledWith('T1', { note: undefined, evidenceUrls: [] });
    expect(mockDeliver).toHaveBeenCalledWith('T1', {
      collectedAmount: 100,
      evidenceUrls: [],
    });
    expect(deleteEvidenceFile).not.toHaveBeenCalled();
  });

  it('上报失败（throw）：不删本地文件（保留给离线队列重试路径）', async () => {
    mockUploadCached.mockResolvedValue({ photoUri: 'https://cdn/p.jpg' });
    mockPickup.mockRejectedValue(new Error('network down'));

    await expect(deliveryApi.confirmPickup('T1', { photoUri: 'file://p/1.jpg' })).rejects.toThrow(
      'network down',
    );
    expect(deleteEvidenceFile).not.toHaveBeenCalled();
    expect(forgetUploadedUrl).not.toHaveBeenCalled();
  });
});
