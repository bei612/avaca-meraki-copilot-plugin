import React from 'react';
import { getFramework } from '@/framework';
import { registerAllBusinessPlugins } from '@/business';

// 智能插件渲染器 - 根据 Avaca 的 apiName 选择正确的插件
// 优化以处理多次渲染和抖动问题
const SmartPluginRenderer = () => {
  const [selectedPlugin, setSelectedPlugin] = React.useState<any>(null);
  const [isInitializing, setIsInitializing] = React.useState<boolean>(true);
  
  // 使用 useRef 来避免重复注册插件
  const hasRegisteredPlugins = React.useRef(false);
  const frameworkRef = React.useRef<any>(null);
  
  // 初始化插件系统 - 防抖动处理
  React.useEffect(() => {
    if (hasRegisteredPlugins.current) return;
    
    const initializePlugins = async () => {
      try {
        setIsInitializing(true);
        
        // 自动发现并注册所有业务插件
        await registerAllBusinessPlugins();
        frameworkRef.current = getFramework();
        
        hasRegisteredPlugins.current = true;
        setIsInitializing(false);
      } catch (error) {
        console.error('[智能路由] 插件初始化失败:', error);
        setIsInitializing(false);
      }
    };
    
    initializePlugins();
  }, []);
  
  // 监听消息并选择插件 - 优化以处理多次渲染
  React.useEffect(() => {
    console.log('[SmartPluginRenderer] 设置消息监听器, isInitializing:', isInitializing, 'frameworkRef:', !!frameworkRef.current);
    
    if (isInitializing || !frameworkRef.current) {
      console.log('[SmartPluginRenderer] 跳过消息监听器设置');
      return;
    }
    
    // 监听来自 Avaca 的消息
    const handleMessage = (event: MessageEvent) => {
      console.log('[SmartPluginRenderer] 收到消息:', event.data?.type, event.data);
      
      if (event.data?.type === 'lobe-chat:init-standalone-plugin') {
        // 注意：不要阻止事件传播，让框架中的插件组件也能收到消息
        const { payload } = event.data;
        const receivedApiName = payload?.apiName;
        console.log('[SmartPluginRenderer] 收到API调用:', receivedApiName);
        
        if (receivedApiName) {
          // 处理follow-up调用：将 followUp_xxx 映射回原始的 xxx
          let actualApiName = receivedApiName;
          if (receivedApiName.startsWith('followUp_')) {
            actualApiName = receivedApiName.replace('followUp_', '');
            console.log('[SmartPluginRenderer] Follow-up调用，映射回原始API:', actualApiName);
          }
          
          // 从框架获取动态API映射
          const targetEndpoint = frameworkRef.current.getEndpointByApiName(actualApiName);
          
          if (targetEndpoint) {
            // 根据端点找到对应的插件
            const allPlugins = frameworkRef.current.getAllPlugins();
            const matchingPlugin = allPlugins.find((plugin: any) => plugin.endpoint === targetEndpoint);
            
            if (matchingPlugin) {
              console.log('[SmartPluginRenderer] 选择插件:', matchingPlugin.name, '用于API:', actualApiName);
              setSelectedPlugin(matchingPlugin);
              return;
            }
          } else {
            console.warn('[SmartPluginRenderer] 未找到端点映射，API名称:', actualApiName);
          }
        }
        
        // 如果没有找到匹配的插件，使用第一个作为默认
        const allPlugins = frameworkRef.current.getAllPlugins();
        setSelectedPlugin(allPlugins[0]);
      }
    };

    console.log('[SmartPluginRenderer] 添加消息监听器');
    window.addEventListener('message', handleMessage);
    
    return () => {
      console.log('[SmartPluginRenderer] 移除消息监听器');
      window.removeEventListener('message', handleMessage);
    };
  }, [isInitializing]);
  
  // 初始化时立即使用第一个插件作为默认，Avaca消息会覆盖这个选择
  React.useEffect(() => {
    if (isInitializing || !frameworkRef.current || selectedPlugin) return;
    
    const allPlugins = frameworkRef.current.getAllPlugins();
    if (allPlugins.length > 0) {
      setSelectedPlugin(allPlugins[0]);
    }
  }, [isInitializing, selectedPlugin]);
  
  // 获取插件列表用于显示
  const plugins = frameworkRef.current ? frameworkRef.current.getAllPlugins() : [];
  
  if (isInitializing) {
    return (
      <div style={{
        alignItems: 'center',
        color: '#94a3b8',
        display: 'flex',
        fontSize: '14px',
        height: '200px',
        justifyContent: 'center'
      }}>
        正在初始化插件系统...
      </div>
    );
  }
  
  if (plugins.length === 0) {
    return (
      <div style={{
        alignItems: 'center',
        color: '#ef4444',
        display: 'flex',
        fontSize: '14px',
        height: '200px',
        justifyContent: 'center'
      }}>
        错误：未注册任何业务插件
      </div>
    );
  }
  
  if (!selectedPlugin) {
    return (
      <div style={{
        alignItems: 'center',
        color: '#94a3b8',
        display: 'flex',
        fontSize: '14px',
        height: '200px',
        justifyContent: 'center'
      }}>
        正在加载插件...
      </div>
    );
  }
  
  // 渲染选中的插件
  return frameworkRef.current.renderPlugin(selectedPlugin.name);
};

export default SmartPluginRenderer;
