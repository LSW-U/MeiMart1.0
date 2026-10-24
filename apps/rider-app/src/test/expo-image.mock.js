/**
 * expo-image 最小 mock（web project / jsdom 用，轻量化省流批2）
 *
 * Why: SafeImage（src/components/ui/SafeImage.tsx）import expo-image——真包是 ESM 发布，
 * web project transformIgnorePatterns 不含 expo-image → "Unexpected token 'export'"。
 * 组件测试只需要 Image 是"可渲染、source/style/className 透传"的 host 壳。
 * 与 react-native.mock.js 同款 data-rn-host 标记模式。
 */
import React from 'react';

module.exports = {
  Image: function ExpoImageMock(props) {
    const { children, ...rest } = props;
    return React.createElement('div', {
      'data-rn-host': 'ExpoImage',
      ...(rest.testID ? { 'data-testid': String(rest.testID) } : {}),
      ...Object.fromEntries(
        Object.entries(rest)
          .filter(([, v]) => typeof v !== 'function')
          .map(([k, v]) => {
            try {
              return [`data-prop-${k}`, typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)];
            } catch {
              return [`data-prop-${k}`, '[object]'];
            }
          }),
      ),
    }, children);
  },
};
