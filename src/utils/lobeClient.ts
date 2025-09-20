// 简化的 LobeChat 插件通信客户端
// 移除复杂的重试机制，专注于基本的 postMessage 通信

type AnyObject = Record<string, any>;

// 访问上层 window 的安全封装（iframe 内）
const getParentWindow = (): Window => (typeof window !== 'undefined' ? window.parent || window : (globalThis as any));

export const postMessageWithRetry = async (
  type: string,
  payload?: AnyObject,
) => {
  const data = { ...payload, type };
  console.log(`[tool-splunk-campus] 📤 发送消息:`, data);
  
  try {
    const parentWin = getParentWindow();
    console.log(`[tool-splunk-campus] 📤 当前域:`, window.location.origin);
    console.log(`[tool-splunk-campus] 📤 发送时间:`, new Date().toISOString());
    
    parentWin.postMessage(data, '*');
    console.log(`[tool-splunk-campus] ✅ 消息已发送`);
  } catch (error) {
    console.error(`[tool-splunk-campus] ❌ 发送消息失败:`, error);
    throw error;
  }
};

// LobeChat 插件通信客户端
export const lobeClient = {
  
  
// 创建助手消息
createAssistantMessage: async (content: string) =>
    postMessageWithRetry('lobe-chat:create-assistant-message', { content }),

  
  



  // 获取插件消息内容
  fetchPluginMessage: async () => {
    // 🔧 修复：使用标准 SDK 协议，不发送 identifier
    await postMessageWithRetry('lobe-chat:fetch-plugin-message', {});
    
    // 等待响应
    return new Promise((resolve) => {
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'lobe-chat:render-plugin') {
          window.removeEventListener('message', handleMessage);
          resolve(event.data.props?.content);
        }
      };
      
      window.addEventListener('message', handleMessage);
      
      // 超时处理
      setTimeout(() => {
        window.removeEventListener('message', handleMessage);
        resolve(null);
      }, 3000);
    });
  },

  
  




// 获取插件设置
fetchPluginSettings: async () =>
    postMessageWithRetry('lobe-chat:fetch-plugin-settings'),

  
  




// 获取插件状态
fetchPluginState: async (key: string) =>
    postMessageWithRetry('lobe-chat:fetch-plugin-state', { key }),

  
  



// 填充插件内容
fillPluginContent: async (content: AnyObject, triggerAiMessage = false) =>
    postMessageWithRetry('lobe-chat:fill-plugin-content', { content, triggerAiMessage }),

  
  



// 打开工具 UI
openToolUI: async () =>
    postMessageWithRetry('openToolUI'),

  
  





// 握手：plugin-ready-for-render
readyForRender: async () =>
    postMessageWithRetry('lobe-chat:plugin-ready-for-render'),

  
  





// 渲染插件
renderPlugin: async (props: AnyObject) =>
    postMessageWithRetry('lobe-chat:render-plugin', { props }),

  
  




// 渲染插件设置
renderPluginSettings: async (props: AnyObject) =>
    postMessageWithRetry('lobe-chat:render-plugin-settings', { props }),

  
  




// 渲染插件状态
renderPluginState: async (props: AnyObject) =>
    postMessageWithRetry('lobe-chat:render-plugin-state', { props }),

  
  




// 触发 AI 消息
triggerAIMessage: async (id: string) =>
    postMessageWithRetry('lobe-chat:trigger-ai-message', { id }),

  
  




// 更新插件设置
updatePluginSettings: async (settings: AnyObject) =>
    postMessageWithRetry('lobe-chat:update-plugin-settings', { settings }),

  
  

// 更新插件状态
updatePluginState: async (key: string, value: any) =>
    postMessageWithRetry('lobe-chat:update-plugin-state', { key, value }),
};