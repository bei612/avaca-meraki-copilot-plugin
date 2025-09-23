/**
 * Temporal Meraki Workflows Plugin - 标准入口
 * 遵循 LobeChat 插件开发最佳实践
 */

import React, { useEffect, useState } from 'react';
import { TemporalPlugin } from '../../components/TemporalPlugin';
import type { LobeInitData } from '../../types';
import { lobeClient } from '../../utils/lobeClient';

const PluginApp: React.FC = () => {
  const [pluginData, setPluginData] = useState<LobeInitData | null>(null);
  const [isReady, setIsReady] = useState(false);

  // 1. 监听 LobeChat 初始化数据（必须在发送ready信号之前设置）
  useEffect(() => {
    console.log('[temporal-plugin] 🚀 开始插件初始化');
    
    let initTimeout: ReturnType<typeof setTimeout>;
    let hasReceivedInit = false;

    const handleMessage = (event: MessageEvent) => {
      console.log('[temporal-plugin] 📨 收到消息:', event.data?.type);
      console.log('[temporal-plugin] 📨 消息来源:', event.origin);
      console.log('[temporal-plugin] 📨 完整消息:', event.data);
      
      if (event.data?.type === 'lobe-chat:init-standalone-plugin') {
         console.log('[temporal-plugin] ✅ 收到初始化数据:', event.data);
         console.log('[temporal-plugin] 🏷️ 多插件初始化隔离机制:');
         console.log('  📊 LobeChat 五层隔离机制:');
         console.log('    1️⃣ 用户层 (userId):', event.data.userId);
         console.log('    2️⃣ 会话层: 每个会话/主题独立存储');
         console.log('    3️⃣ 插件类型层 (identifier):', event.data.payload?.identifier);
         console.log('    4️⃣ 工具调用层 (tool_call_id):', event.data.tool_call_id || event.data.payload?.id);
         console.log('    5️⃣ 消息层: 每个插件实例独有 messageId');
         console.log('  🔐 隔离保证:');
         console.log('    - 此 temporal-plugin 实例与其他插件完全隔离');
         console.log('    - 数据存储在独立的 messageId 中');
         console.log('    - 无法访问其他插件或用户的数据');
         console.log('  📋 技术细节:');
         console.log('    - API名称 (apiName):', event.data.payload?.apiName);
         console.log('    - 插件类型 (type):', event.data.payload?.type);
        hasReceivedInit = true;
        if (initTimeout) clearTimeout(initTimeout);
        setPluginData(event.data);
        setIsReady(true);
      } else {
        console.log('[temporal-plugin] ❓ 未处理的消息类型:', event.data?.type);
      }
    };

    window.addEventListener('message', handleMessage);
    
    // 2. 等待一小段时间确保主应用监听器准备好，然后发送插件就绪信号
    (async () => {
      try {
        // 等待 100ms 确保主应用的监听器已经设置
        await new Promise<void>(resolve => {
          setTimeout(() => resolve(), 100);
        });
        
        console.log('[temporal-plugin] 发送就绪信号');
        console.log('[temporal-plugin] 📤 发送消息内容:', { type: 'lobe-chat:plugin-ready-for-render' });
        console.log('[temporal-plugin] 📤 发送目标:', window.parent);
        console.log('[temporal-plugin] 📤 当前窗口信息:', {
          location: window.location.href,
          origin: window.location.origin,
          parent: window.parent !== window ? '有父窗口' : '无父窗口'
        });
        
        await lobeClient.readyForRender();
        
        // 设置初始化超时检查
        initTimeout = setTimeout(async () => {
          if (!hasReceivedInit) {
            console.error('[temporal-plugin] ❌ 超时未收到初始化数据，可能是历史会话加载问题');
            console.log('[temporal-plugin] 🔄 开始积极重试策略');
            
            // 积极重试策略：每隔 500ms 发送一次，总共尝试 10 次
            for (let i = 0; i < 10; i++) {
              if (hasReceivedInit) break;
              
              console.log(`[temporal-plugin] 🔄 重试第 ${i + 1} 次发送就绪信号`);
              console.log('[temporal-plugin] 📤 重发消息内容:', { type: 'lobe-chat:plugin-ready-for-render' });
              console.log('[temporal-plugin] 📤 重发时间:', new Date().toISOString());
              
              // 尝试发送就绪信号
              window.parent.postMessage({
                type: 'lobe-chat:plugin-ready-for-render'
              }, '*');
              
              console.log('[temporal-plugin] ✅ 重发完成，等待响应...');
              
              // 等待 500ms 再次尝试
              await new Promise<void>(resolve => {
                setTimeout(() => resolve(), 500);
              });
            }
            
            if (!hasReceivedInit) {
              console.error('[temporal-plugin] ❌ 所有重试都失败了，可能是主应用监听器问题');
            }
          }
        }, 3000);
        
      } catch (error) {
        console.error('[temporal-plugin] 就绪信号发送失败:', error);
        console.log('[temporal-plugin] 🔄 降级到直接 postMessage');
        console.log('[temporal-plugin] 📤 降级消息内容:', { type: 'lobe-chat:plugin-ready-for-render' });
        console.log('[temporal-plugin] 📤 降级时间:', new Date().toISOString());
        
        // 降级方案：直接使用 postMessage
        window.parent.postMessage({
          type: 'lobe-chat:plugin-ready-for-render'
        }, '*');
        
        console.log('[temporal-plugin] ✅ 降级发送完成');
      }
    })();

    return () => {
      console.log('[temporal-plugin] 移除消息监听器');
      if (initTimeout) clearTimeout(initTimeout);
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

  return <TemporalPlugin pluginData={pluginData} />;
};

export default PluginApp;