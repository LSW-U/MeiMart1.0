import { getApiErrorMessage, isAxios401 } from '../error';

describe('getApiErrorMessage', () => {
  it('提取后端 string message（409 E-REFUND-002 重复退款）', () => {
    const error = {
      response: {
        status: 409,
        data: {
          statusCode: 409,
          code: 'E-REFUND-002',
          message: 'Refund already in progress (status: PENDING)',
          error: 'Conflict',
        },
      },
      message: 'Request failed with status code 409',
    };
    expect(getApiErrorMessage(error)).toBe('Refund already in progress (status: PENDING)');
  });

  it('提取后端 message 数组首个（NestJS class-validator 批量校验）', () => {
    const error = {
      response: {
        status: 400,
        data: { message: ['rating must be an integer', 'content must be a string'] },
      },
      message: 'Request failed with status code 400',
    };
    expect(getApiErrorMessage(error)).toBe('rating must be an integer');
  });

  it('message 数组空时回退 err.message', () => {
    const error = {
      response: { status: 400, data: { message: [] } },
      message: 'Request failed with status code 400',
    };
    expect(getApiErrorMessage(error, 'fallback')).toBe('Request failed with status code 400');
  });

  it('无 response（网络错误/超时）回退 err.message', () => {
    const error = { message: 'Network Error' };
    expect(getApiErrorMessage(error)).toBe('Network Error');
  });

  it('response.data 无 message 字段回退 err.message', () => {
    const error = {
      response: { status: 500, data: { something: 'else' } },
      message: 'Request failed with status code 500',
    };
    expect(getApiErrorMessage(error)).toBe('Request failed with status code 500');
  });

  it('err.message 也缺失时回退 fallback', () => {
    const error = { response: { status: 500, data: {} } };
    expect(getApiErrorMessage(error, 'custom fallback')).toBe('custom fallback');
  });

  it('null/undefined 错误回退 fallback', () => {
    expect(getApiErrorMessage(null, 'fb')).toBe('fb');
    expect(getApiErrorMessage(undefined, 'fb')).toBe('fb');
  });

  it('非 object 错误回退 fallback', () => {
    expect(getApiErrorMessage('string error', 'fb')).toBe('fb');
  });

  it('默认 fallback 是 Request failed', () => {
    expect(getApiErrorMessage(null)).toBe('Request failed');
  });

  it('提取成功时 fallback 不影响结果', () => {
    const error = {
      response: { data: { message: '真实 message' } },
      message: '应被忽略',
    };
    expect(getApiErrorMessage(error, '应被忽略')).toBe('真实 message');
  });
});

describe('isAxios401', () => {
  it('status 401 返回 true', () => {
    expect(isAxios401({ response: { status: 401 } })).toBe(true);
  });

  it('status 409 返回 false', () => {
    expect(isAxios401({ response: { status: 409 } })).toBe(false);
  });

  it('无 response 返回 false', () => {
    expect(isAxios401({ message: 'Network Error' })).toBe(false);
  });

  it('null 返回 false', () => {
    expect(isAxios401(null)).toBe(false);
  });

  it('非 object 返回 false', () => {
    expect(isAxios401('string')).toBe(false);
  });
});
