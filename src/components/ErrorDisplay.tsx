/**
 * 错误显示组件
 */

import React from 'react';

interface ErrorDisplayProps {
  message: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message }) => {
  return (
    <div style={{
      alignItems: 'center',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      height: '400px',
      justifyContent: 'center',
      padding: '20px'
    }}>
      {/* 错误图标 */}
      <div style={{
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderRadius: '50%',
        color: '#ef4444',
        display: 'flex',
        fontSize: '24px',
        height: '48px',
        justifyContent: 'center',
        width: '48px'
      }}>
        ⚠️
      </div>
      
      {/* 错误标题 */}
      <div style={{
        color: '#ef4444',
        fontSize: '16px',
        fontWeight: '600'
      }}>
        加载失败
      </div>

      {/* 错误信息 */}
      <div style={{
        color: '#94a3b8',
        fontSize: '14px',
        maxWidth: '300px',
        textAlign: 'center'
      }}>
        {message}
      </div>
    </div>
  );
};
