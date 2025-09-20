/**
 * School Attendance Analytics Plugin - 标准入口
 * 遵循 LobeChat 插件开发最佳实践
 */

import React, { useEffect, useState } from 'react';
import { AttendancePlugin } from '../../components/AttendancePlugin';
import type { LobeInitData } from '../../types';

const PluginApp: React.FC = () => {
  const [pluginData, setPluginData] = useState<LobeInitData | null>(null);
  const [isReady, setIsReady] = useState(false);

  // 1. 监听 LobeChat 初始化数据（必须在发送ready信号之前设置）
  useEffect(() => {
    console.log('[tool-splunk-campus] 🚀 开始插件初始化');

    const handleMessage = (event: MessageEvent) => {
      console.log('[tool-splunk-campus] 收到消息:', event.data?.type);
      
      if (event.data?.type === 'lobe-chat:init-standalone-plugin') {
        console.log('[tool-splunk-campus] 收到初始化数据:', event.data);
        setPluginData(event.data);
        setIsReady(true);
      }
    };

    window.addEventListener('message', handleMessage);
    
    // 2. 设置监听器后立即发送插件就绪信号
    console.log('[tool-splunk-campus] 发送就绪信号');
    window.parent.postMessage({
      type: 'lobe-chat:plugin-ready-for-render'
    }, '*');

    return () => {
      console.log('[tool-splunk-campus] 移除消息监听器');
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // 3. 渲染状态
  if (!isReady) {
    return (
      <div style={{
        alignItems: 'center',
        color: '#94a3b8',
        display: 'flex',
        fontSize: '14px',
        height: '400px',
        justifyContent: 'center'
      }}>
        正在初始化插件...
      </div>
    );
  }

  if (!pluginData) {
    return (
      <div style={{
        alignItems: 'center',
        color: '#ef4444',
        display: 'flex',
        fontSize: '14px',
        height: '400px',
        justifyContent: 'center'
      }}>
        插件数据加载失败
      </div>
    );
  }

  return <AttendancePlugin pluginData={pluginData} />;
};

export default PluginApp;