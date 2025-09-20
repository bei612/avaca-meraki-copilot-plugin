/**
 * Avaca 插件框架 - 统一入口
 * 提供最简单的插件开发体验
 * 支持业务模块自动发现和注册
 */

import React from 'react';
import { lobeChat } from '@lobehub/chat-plugin-sdk/client';
import { ENV_CONFIG } from '@/config/env';

// ==================== 常量配置 ====================

const FRAMEWORK_CONFIG = {
  MESSAGES: {
    INIT_PLUGIN: 'lobe-chat:init-standalone-plugin',
    READY_SIGNAL: 'lobe-chat:plugin-ready-for-render',
    RENDER_PLUGIN: 'lobe-chat:render-plugin'
  },
  RETRY: {
    EXPONENTIAL_BASE: 2,
    MAX_ATTEMPTS: 3
  },
  TIMEOUTS: {
    API_REQUEST: 30_000,
    LOBECHAT_INIT: 3000,
    MESSAGE_PROCESSING_THROTTLE: 500,
    RETRY_DELAY_BASE: 1000,
    RETRY_DELAY_MAX: 5000,
    SAVE_DELAY: 200
  }
} as const;

// ==================== 工具类 ====================

/**
 * 网络请求工具类
 */
const NetworkUtils = {
  async fetchWithTimeout(
    url: string, 
    options: globalThis.RequestInit, 
    timeout = FRAMEWORK_CONFIG.TIMEOUTS.API_REQUEST
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('请求超时，请检查网络连接');
      } else if (error.message?.includes('Failed to fetch')) {
        throw new Error('网络连接失败，请检查网络状态');
      }
      throw error;
    }
  },

  async getErrorMessage(response: Response): Promise<string> {
    try {
      const errorText = await response.text();
      return errorText || response.statusText;
    } catch {
      return response.statusText;
    }
  },
};

/**
 * 重试工具类
 */
const RetryUtils = {
  async withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts = FRAMEWORK_CONFIG.RETRY.MAX_ATTEMPTS,
    shouldRetry?: (error: any) => boolean
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        const isLastAttempt = attempt === maxAttempts;
        const shouldRetryError = shouldRetry ? shouldRetry(error) : true;
        
        if (isLastAttempt || !shouldRetryError) {
          throw error;
        }
        
        const delay = Math.min(
          FRAMEWORK_CONFIG.TIMEOUTS.RETRY_DELAY_BASE * Math.pow(FRAMEWORK_CONFIG.RETRY.EXPONENTIAL_BASE, attempt - 1),
          FRAMEWORK_CONFIG.TIMEOUTS.RETRY_DELAY_MAX
        );
        
        await new Promise<void>(resolve => {
          setTimeout(() => resolve(), delay);
        });
      }
    }
    throw new Error('重试失败');
  },
};

/**
 * 消息验证工具类
 */
const MessageValidator = {
  isValidEvent(event: MessageEvent): boolean {
    return !!(event?.data && typeof event.data === 'object' && event.data.type);
  },

  isValidPayload(payload: unknown): payload is Record<string, any> {
    return !!(payload && typeof payload === 'object');
  },

  isValidUserId(userId: unknown): userId is string {
    return typeof userId === 'string' && userId.trim().length > 0;
  },
};

// ==================== 类型定义 ====================

export interface PluginConfig<T = any> {
  apiHandler: (req: Request) => Promise<Response>;
  checkPermission?: (userId: string) => Promise<boolean>;
  description: string;
  endpoint: string;
  name: string;
  onError?: (error: Error) => void;
  render: (props: { 
    data: T; 
    onRenderComplete?: () => void;
    openDrawer: (title: string, data: any) => Promise<void>;
  }) => React.ReactNode;
  validator: (data: unknown) => data is T;
}

// 业务模块配置接口
export interface BusinessModuleConfig {
  apiMappings: Record<string, string>;
  moduleId: string; // apiName -> endpoint
  plugins: PluginConfig[];
  serverHandlers?: Record<string, (_req: Request) => Promise<Response>>; // 服务端专用处理器
}

export interface PluginState {
  currentUserId: string | null;
  data: any;
  error: string | null;
  hasPermission: boolean | null;
  isLoading: boolean;
  isWaitingForUserId: boolean;
}

// ==================== 核心框架类 ====================

export class AvacaPluginFramework {
  private static instance: AvacaPluginFramework | null = null;
  private plugins = new Map<string, PluginConfig>();
  private endpointMap = new Map<string, PluginConfig>();
  private businessModules = new Map<string, BusinessModuleConfig>();
  private apiMappings = new Map<string, string>(); // apiName -> endpoint

  static getInstance(): AvacaPluginFramework {
    if (!AvacaPluginFramework.instance) {
      AvacaPluginFramework.instance = new AvacaPluginFramework();
    }
    return AvacaPluginFramework.instance;
  }

  /**
   * 注册业务模块（新方法）
   */
  registerBusinessModule(config: BusinessModuleConfig): void {
    // 存储业务模块配置
    this.businessModules.set(config.moduleId, config);
    
    // 注册API映射
    Object.entries(config.apiMappings).forEach(([apiName, endpoint]) => {
      this.apiMappings.set(apiName, endpoint);
    });
    
    // 注册插件
    config.plugins.forEach(plugin => {
      this.plugins.set(plugin.name, plugin);
      this.endpointMap.set(plugin.endpoint, plugin);
    });
  }

  /**
   * 获取API映射
   */
  getApiMappings(): Record<string, string> {
    return Object.fromEntries(this.apiMappings.entries());
  }

  /**
   * 根据API名称获取端点
   */
  getEndpointByApiName(apiName: string): string | undefined {
    return this.apiMappings.get(apiName);
  }

  register<T>(config: PluginConfig<T>): void {
    this.plugins.set(config.name, config);
    this.endpointMap.set(config.endpoint, config);
  }

  /**
   * 获取插件
   */
  getPlugin(name: string): PluginConfig | undefined {
    return this.plugins.get(name);
  }

  /**
   * 根据endpoint获取插件
   */
  getPluginByEndpoint(endpoint: string): PluginConfig | undefined {
    return this.endpointMap.get(endpoint);
  }

  /**
   * 处理API请求
   */
  async handleApiRequest(path: string, req: Request): Promise<Response> {
    const plugin = this.getPluginByEndpoint(path);
    if (!plugin) {
      return new Response(JSON.stringify({
        error: 'API路径不存在',
        timestamp: Date.now()
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 404
      });
    }

    try {
      return await plugin.apiHandler(req);
    } catch (error: any) {
      return new Response(JSON.stringify({
        error: error?.message || 'API处理失败',
        timestamp: Date.now()
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  }

  /**
   * 渲染插件
   */
  renderPlugin(name: string): React.ReactElement | null {
    const plugin = this.getPlugin(name);
    if (!plugin) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    return React.createElement(PluginTemplate, { config: plugin });
  }

  /**
   * 获取所有插件
   */
  getAllPlugins(): PluginConfig[] {
    return Array.from(this.plugins.values());
  }

  /**
   * 获取所有端点
   */
  getAllEndpoints(): string[] {
    return Array.from(this.endpointMap.keys());
  }
}

// ==================== 插件模板组件 ====================

interface PluginTemplateProps {
  config: PluginConfig;
}

const PluginTemplate: React.FC<PluginTemplateProps> = ({ config }) => {
  const [state, setState] = React.useState<PluginState>({
    currentUserId: null,
    data: null,
    error: null,
    hasPermission: null,
    isLoading: true,
    isWaitingForUserId: true
  });
  const isInitialized = React.useRef(false);
  const messageHandlerRef = React.useRef<((_event: MessageEvent) => void) | null>(null);
  const initializationPromiseRef = React.useRef<Promise<void> | null>(null);
  const fallbackTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // 权限检查 - 支持API级别的细粒度权限控制
  const checkPermission = React.useCallback(async (userId: string): Promise<boolean> => {
    try {
      // 1. 优先使用插件自定义权限检查
      if (config.checkPermission) {
        return await config.checkPermission(userId);
      }

      // 2. 获取API级别权限配置
      const apiPermissions = ENV_CONFIG.getApiPermissions();
      
      // 生成多种可能的API键名进行匹配
      const apiName = config.name.toLowerCase().replaceAll(/[\s-]+/g, '_');
      const endpointKey = config.endpoint.replace(/^\//, '').replaceAll(/[/-]/g, '_');
      
      // 从端点路径生成更多可能的键名
      const endpointParts = config.endpoint.split('/').filter(Boolean);
      const possibleKeys = [
        apiName,
        endpointKey,
        endpointParts.join('_'),
        endpointParts.slice(1).join('_'), // 去掉第一部分（如meraki）
        ...endpointParts.map(part => part.replaceAll('-', '_'))
      ].filter(Boolean);
      
      // 权限调试日志（仅在开发模式输出）
      // 3. 检查API级别权限 - 尝试所有可能的键名
      let apiSpecificPermission: string[] | 'ALLOW_ALL' | 'DENY_ALL' | undefined;
      
      for (const key of possibleKeys) {
        if (apiPermissions[key] !== undefined) {
          apiSpecificPermission = apiPermissions[key];
          break;
        }
      }

      
      if (apiSpecificPermission !== undefined) {
        // 处理特殊权限值
        if (apiSpecificPermission === 'ALLOW_ALL') {
          return true;
        }
        
        if (apiSpecificPermission === 'DENY_ALL') {
          return false;
        }
        
        // 处理用户列表
        if (Array.isArray(apiSpecificPermission) && apiSpecificPermission.length > 0) {
          return apiSpecificPermission.includes(userId);
        }
      }

      // 4. 回退到全局权限检查
      const globalAllowedIds = ENV_CONFIG.pluginWhitelist;
      
      // 如果全局白名单为空，允许所有用户访问
      if (globalAllowedIds.length === 0) {
        return true;
      }
      
      // 检查用户ID是否在全局白名单中
      return globalAllowedIds.includes(userId);
    } catch (error) {
      console.error('[插件] 权限检查出错:', error);
      return false;
    }
  }, [config]);

  // 带重试的保存函数
  const saveWithRetry = React.useCallback(async (payload: any, trigger: boolean) => {
    // 检查Avaca SDK是否可用
    if (!lobeChat || typeof lobeChat.setPluginMessage !== 'function') {
      return;
    }

    try {
      await RetryUtils.withRetry(
        async () => {
          await lobeChat.setPluginMessage(payload, trigger);
          return true;
        },
        FRAMEWORK_CONFIG.RETRY.MAX_ATTEMPTS,
        (error: any) => {
          const isRetryableError = 
            error?.message?.includes('Parent message') ||
            error?.message?.includes('not found') ||
            error?.message?.includes('network') ||
            error?.message?.includes('fetch');
          
          // 非重试错误，静默处理
          
          return isRetryableError;
        }
      );
    } catch (error) {
      console.error('[插件] 保存最终失败:', error);
      // 静默失败，不影响主流程
    }
  }, []);

  // 权限拒绝处理 - 像正常数据一样保存到聊天记录
  const handlePermissionDenied = React.useCallback(async (userId: string, apiName: string) => {
    
    try {
      // 构建权限拒绝数据（格式与正常数据保持一致）
      const deniedData = {
        data: {
          
          details: {
            apiName,
            requiredPermissions: `需要将用户ID "${userId}" 添加到相应的权限配置中`,
            timestamp: Date.now(),
            userId
          },
          
error: '权限被拒绝',
          
message: '抱歉，您无权使用该工具',
          // 权限拒绝的特殊标记
type: 'permission_denied'
        },
        timestamp: Date.now()
      };

      // 更新UI状态为权限拒绝数据
      setState(prev => ({ 
        ...prev, 
        data: deniedData,
        error: null,
        hasPermission: false,
        isLoading: false 
      }));

      // 像正常数据一样保存到聊天记录并触发AI
      const operationId = `op_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      const persistPayload = { ...deniedData, __opId: operationId };
      
      // 先保存但不触发AI
      await saveWithRetry(persistPayload, false);
      
      // 延迟触发AI回复（像正常数据流程一样）
      setTimeout(async () => {
        try {
          await saveWithRetry(deniedData, true);
        } catch {
          // 权限拒绝数据保存失败，静默处理
        }
      }, 200);
      
    } catch (error) {
      console.error('[插件] 处理权限拒绝失败:', error);
    }
  }, [saveWithRetry]);

  // 权限拒绝数据验证器
  const isPermissionDeniedData = React.useCallback((data: unknown): boolean => {
    return Boolean(
      data && 
      typeof data === 'object' && 
      'data' in data && 
      data.data && 
      typeof data.data === 'object' && 
      'type' in data.data && 
      (data.data as any).type === 'permission_denied'
    );
  }, []);

  // 统一数据验证器（支持正常数据和权限拒绝数据）
  const validateData = React.useCallback((data: unknown): boolean => {
    // 首先检查是否是权限拒绝数据
    if (isPermissionDeniedData(data)) {
      return true;
    }
    
    // 然后检查是否是正常业务数据
    if (config.validator(data)) {
      return true;
    }
    
    return false;
  }, [config.validator, isPermissionDeniedData]);

  // 保存数据到Avaca的专用方法
  const saveDataToAvaca = React.useCallback(async (data: any): Promise<void> => {
    const operationId = `op_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const persistPayload = { ...data, __opId: operationId };
    
    // 先保存但不触发AI
    await saveWithRetry(persistPayload, false);
    
    // 延迟触发AI回复
    setTimeout(async () => {
      try {
        await saveWithRetry(data, true);
      } catch {
        // 静默处理失败
      }
    }, FRAMEWORK_CONFIG.TIMEOUTS.SAVE_DELAY);
  }, [saveWithRetry]);

  // 存储待保存的数据，等待渲染完成后保存
  const pendingDataRef = React.useRef<any>(null);

  // 渲染完成回调 - 由业务组件调用
  const handleRenderComplete = React.useCallback(async () => {
    if (pendingDataRef.current) {
      try {
        await saveDataToAvaca(pendingDataRef.current);
        pendingDataRef.current = null; // 清空待保存数据
      } catch {
        // 静默处理保存失败
      }
    }
  }, [saveDataToAvaca]);

  // 数据获取 - 通过HTTP API调用服务端处理器
  const fetchData = React.useCallback(async (params: any = {}): Promise<void> => {
    setState(prev => ({ ...prev, error: null, isLoading: true }));

    // 清除初始化超时计时器，因为我们已经开始获取数据
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }

    try {
      const apiUrl = `/api${config.endpoint}`;
      
      const response = await NetworkUtils.fetchWithTimeout(apiUrl, {
        body: JSON.stringify(params),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST'
      });

      if (!response.ok) {
        const errorMessage = await NetworkUtils.getErrorMessage(response);
        throw new Error(`API调用失败: ${response.status} ${response.statusText} - ${errorMessage}`);
      }

      const rawData = await response.json();
      
      // 数据验证
      if (!rawData || typeof rawData !== 'object') {
        throw new Error('服务器返回数据格式错误');
      }
      
      if (!validateData(rawData)) {
        throw new Error('数据格式验证失败，请检查服务器响应');
      }
      
      setState(prev => ({ 
        ...prev, 
        data: rawData, 
        error: null,
        isLoading: false 
      }));

      // 将数据存储到待保存队列，等待渲染完成后保存
      pendingDataRef.current = rawData;
      
    } catch (error: any) {
      console.error('[插件] 数据获取失败:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message, 
        isLoading: false 
      }));
      
      config.onError?.(error);
    }
  }, [config, validateData]);

  // 抽屉服务 - 参考old_project的实现
  const openDrawer = React.useCallback(async (title: string, data: any): Promise<void> => {
    try {


      // 构建紧凑暗紫色主题的HTML内容
      const buildDarkThemeHTML = (detailData: any): string => {
        const uniqueId = `detail-${Math.random().toString(36).slice(2, 8)}`;
        
        // 生成现代化卡片式详情内容
        const generateDetailSections = (data: any): string => {
          return Object.entries(data)
            .filter(([sectionKey]) => sectionKey !== 'raw')
            .map(([sectionKey, sectionValue]) => {
              // 如果是对象，显示为现代化卡片
              if (typeof sectionValue === 'object' && sectionValue !== null && !Array.isArray(sectionValue)) {
                const entries = Object.entries(sectionValue);
                if (entries.length === 0) return '';
                
                const items = entries.map(([key, value]) => `
                  <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    padding: 12px 16px;
                    background: rgba(15, 15, 35, 0.4);
                    margin-bottom: 2px;
                    transition: all 0.2s ease;
                    border-left: 3px solid transparent;
                  " onmouseover="this.style.background='rgba(30, 27, 75, 0.6)'; this.style.borderLeftColor='rgba(99, 102, 241, 0.6)';" onmouseout="this.style.background='rgba(15, 15, 35, 0.4)'; this.style.borderLeftColor='transparent';">
                    <span style="
                      color: #c4b5fd;
                      font-size: 11px;
                      font-weight: 500;
                      min-width: 100px;
                      margin-right: 20px;
                      opacity: 0.9;
                    ">${key}</span>
                    <span style="
                      color: #e9d5ff;
                      font-size: 11px;
                      line-height: 1.4;
                      text-align: right;
                      flex: 1;
                      word-break: break-all;
                      font-weight: 400;
                    ">${typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}</span>
                  </div>
                `).join('');
                
                return `
                  <div style="
                    margin-bottom: 24px;
                    background: rgba(10, 10, 15, 0.6);
                    border-radius: 12px;
                    overflow: hidden;
                    border: 1px solid rgba(99, 102, 241, 0.15);
                    box-shadow: 0 4px 12px rgba(15, 15, 35, 0.4);
                  ">
                    <div style="
                      padding: 14px 16px;
                      background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(79, 70, 229, 0.1) 100%);
                      border-bottom: 1px solid rgba(99, 102, 241, 0.2);
                    ">
                      <h4 style="
                        margin: 0;
                        color: #c4b5fd;
                        font-size: 12px;
                        font-weight: 600;
                        letter-spacing: 0.5px;
                        text-transform: uppercase;
                        opacity: 1;
                      ">${sectionKey}</h4>
                    </div>
                    <div style="background: rgba(10, 10, 15, 0.8);">
                      ${items}
                    </div>
                  </div>
                `;
              } 
              // 如果是数组，显示为现代化列表
              else if (Array.isArray(sectionValue)) {
                const items = sectionValue.map((item, index) => `
                  <div style="
                    display: flex;
                    align-items: flex-start;
                    padding: 12px 16px;
                    background: rgba(15, 15, 35, 0.4);
                    margin-bottom: 2px;
                    transition: all 0.2s ease;
                    border-left: 3px solid transparent;
                  " onmouseover="this.style.background='rgba(30, 27, 75, 0.6)'; this.style.borderLeftColor='rgba(99, 102, 241, 0.6)';" onmouseout="this.style.background='rgba(15, 15, 35, 0.4)'; this.style.borderLeftColor='transparent';">
                    <span style="
                      color: #8b5cf6;
                      font-size: 12px;
                      font-weight: 600;
                      background: rgba(139, 92, 246, 0.2);
                      border-radius: 50%;
                      width: 22px;
                      height: 22px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      margin-right: 14px;
                      flex-shrink: 0;
                      border: 1px solid rgba(139, 92, 246, 0.3);
                    ">${index + 1}</span>
                    <span style="
                      color: #e9d5ff;
                      font-size: 11px;
                      line-height: 1.4;
                      flex: 1;
                      font-weight: 400;
                    ">${String(item)}</span>
                  </div>
                `).join('');
                
                return `
                  <div style="
                    margin-bottom: 24px;
                    background: rgba(10, 10, 15, 0.6);
                    border-radius: 12px;
                    overflow: hidden;
                    border: 1px solid rgba(99, 102, 241, 0.15);
                    box-shadow: 0 4px 12px rgba(15, 15, 35, 0.4);
                  ">
                    <div style="
                      padding: 14px 16px;
                      background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(79, 70, 229, 0.1) 100%);
                      border-bottom: 1px solid rgba(99, 102, 241, 0.2);
                    ">
                      <h4 style="
                        margin: 0;
                        color: #c4b5fd;
                        font-size: 12px;
                        font-weight: 600;
                        letter-spacing: 0.5px;
                        text-transform: uppercase;
                        opacity: 1;
                      ">${sectionKey}</h4>
                    </div>
                    <div style="background: rgba(10, 10, 15, 0.8);">
                      ${items || '<div style="padding: 16px; color: #c4b5fd; text-align: center; font-style: italic; opacity: 0.8; font-size: 11px;">No data</div>'}
                    </div>
                  </div>
                `;
              }
              // 其他类型直接显示
              else {
                return `
                  <div style="
                    margin-bottom: 24px;
                    background: rgba(10, 10, 15, 0.6);
                    border-radius: 12px;
                    overflow: hidden;
                    border: 1px solid rgba(99, 102, 241, 0.15);
                    box-shadow: 0 4px 12px rgba(15, 15, 35, 0.4);
                  ">
                    <div style="
                      padding: 14px 16px;
                      background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(79, 70, 229, 0.1) 100%);
                      border-bottom: 1px solid rgba(99, 102, 241, 0.2);
                    ">
                      <h4 style="
                        margin: 0;
                        color: #c4b5fd;
                        font-size: 12px;
                        font-weight: 600;
                        letter-spacing: 0.5px;
                        text-transform: uppercase;
                        opacity: 1;
                      ">${sectionKey}</h4>
                    </div>
                    <div style="
                      padding: 16px;
                      background: rgba(10, 10, 15, 0.8);
                      color: #e9d5ff;
                      font-size: 11px;
                      line-height: 1.5;
                      font-weight: 400;
                    ">${String(sectionValue)}</div>
                  </div>
                `;
              }
            })
            .join('');
        };

        return `
          <div style="
            font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
          ">
            <div style="padding: 20px;">
              ${generateDetailSections(detailData)}
            </div>
            <div style="
              padding: 16px 20px;
            ">
              <button onclick="
                const el=document.getElementById('raw-${uniqueId}');
                const btn=this;
                const hidden=el.style.display==='none' || el.style.display==='';
                el.style.display= hidden ? 'block' : 'none';
                btn.textContent = hidden ? 'Hide Raw Data' : 'View Raw Data';
              "
                style="
                  background: rgba(99, 102, 241, 0.1);
                  color: #c4b5fd;
                  border: 1px solid rgba(99, 102, 241, 0.3);
                  padding: 8px 14px;
                  border-radius: 6px;
                  font-size: 11px;
                  cursor: pointer;
                  transition: all 0.3s ease;
                  font-weight: 500;
                "
                onmouseover="this.style.background='rgba(99, 102, 241, 0.2)'; this.style.borderColor='rgba(99, 102, 241, 0.5)'; this.style.color='#e9d5ff';"
                onmouseout="this.style.background='rgba(99, 102, 241, 0.1)'; this.style.borderColor='rgba(99, 102, 241, 0.3)'; this.style.color='#c4b5fd';">
                View Raw Data
              </button>
              <div id="raw-${uniqueId}" style="display:none;margin-top:16px;">
                <pre style="
                  margin: 0;
                  padding: 16px;
                  background: rgba(15, 15, 35, 0.8);
                  border: 1px solid rgba(49, 46, 129, 0.4);
                  border-radius: 8px;
                  color: #c4b5fd;
                  font-family: 'SF Mono','Menlo','Consolas',monospace;
                  font-size: 10px;
                  white-space: pre-wrap;
                  line-height: 1.6;
                  overflow: visible;
                ">${JSON.stringify(detailData, null, 2)}</pre>
              </div>
            </div>
          </div>
        `;
      };

      // 抽屉服务（参考old_project的成功实现）
      await lobeChat.setPluginState('drawerData', {
        content: buildDarkThemeHTML(data),
        metadata: {
          type: 'detail_view',
          userId: state.currentUserId
        },
        timestamp: Date.now(),
        title: title,
        width: 'calc(100vw - 100px)' // 设置抽屉宽度
      });
      
      // 触发抽屉展开（参考old_project）
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ 
          type: 'openToolUI',
          width: 'calc(100vw - 100px)' // 设置抽屉宽度
        }, '*');
      }

    } catch (error) {
      console.error('[插件] 打开抽屉失败:', error);
    }
  }, [state.currentUserId]);

  // 会话级别的执行控制（一个组件实例只执行一次）
  const hasExecutedRef = React.useRef(false);

  // 初始化
  React.useEffect(() => {
    const initialize = async () => {
      console.log('[插件] 开始初始化');
      
      // 防止并发初始化
      if (initializationPromiseRef.current) {
        console.log('[插件] 等待现有初始化完成');
        await initializationPromiseRef.current;
        return;
      }
      
      // 创建初始化Promise，防止并发初始化
      const initPromise = (async (): Promise<void> => {
        try {
          // 第一步：发送ready信号给Avaca
          console.log('[插件] 发送ready信号给Avaca');
          try {
            if (window.parent && window.parent !== window) {
              window.parent.postMessage({
                type: FRAMEWORK_CONFIG.MESSAGES.READY_SIGNAL
              }, '*');
              console.log('[插件] ready信号发送成功');
            } else {
              console.log('[插件] 不在iframe中，跳过ready信号');
            }
          } catch (error) {
            console.error('[插件] ready信号发送失败:', error);
          }
          
          // 第二步：检查历史数据
          console.log('[插件] 检查历史数据');
          const checkHistory = async () => {
            try {
              const history = await lobeChat.getPluginMessage();
              console.log('[插件] 历史数据检查结果:', history ? '有数据' : '无数据');
              if (history && typeof history === 'object') {
                console.log('[插件] 历史数据内容:', JSON.stringify(history, null, 2));
                const isValid = validateData(history);
                console.log('[插件] 历史数据验证结果:', isValid);
                if (!isValid) {
                  console.warn('[插件] 历史数据验证失败，数据结构:', Object.keys(history));
                }
                return isValid ? history : null;
              }
              return null;
            } catch (error) {
              console.error('[插件] 历史数据检查出错:', error);
              return null;
            }
          };

          const historyData = await checkHistory();
          
          if (historyData) {
            // 有历史数据，直接使用
            console.log('[插件] 发现历史数据，直接渲染');
            setState(prev => ({ 
              ...prev, 
              data: historyData,
              error: null,
              isLoading: false,
              isWaitingForUserId: false
            }));
            return;
          }
          
          // 没有历史数据，等待Avaca发送消息
          console.log('[插件] 无历史数据，等待Avaca消息');
          setState(prev => ({ 
            ...prev, 
            isLoading: true,
            isWaitingForUserId: true
          }));
        
        // 第二步：监听Avaca消息获取真实userId（推送模式）
        const handleMessage = async (event: MessageEvent) => {
          try {
            // 消息验证
            if (!MessageValidator.isValidEvent(event)) {
              return;
            }
            
            const data = event.data;
            
            // 会话级别去重：一个组件实例只执行一次
            if (data.type === FRAMEWORK_CONFIG.MESSAGES.INIT_PLUGIN) {
              if (hasExecutedRef.current) {
                console.log('[插件] 本会话已执行过，跳过重复消息');
                return;
              }
              
              hasExecutedRef.current = true;
              console.log('[插件] 首次执行，标记会话状态');
              console.log('[插件框架] 收到init消息:', data.type);
            }

            // 处理初始化消息
            if (data.type === FRAMEWORK_CONFIG.MESSAGES.INIT_PLUGIN) {
              const { userId, payload } = data;
              
              // 验证用户ID和payload
              if (!MessageValidator.isValidUserId(userId)) {
                console.error('[插件] ❌ Avaca userId无效:', userId);
                setState(prev => ({
                  ...prev,
                  error: '用户ID无效，插件无法正常工作',
                  isLoading: false,
                  isWaitingForUserId: false
                }));
                return;
              }
              
              if (!MessageValidator.isValidPayload(payload)) {
                console.error('[插件] ❌ Avaca payload无效:', payload);
                setState(prev => ({
                  ...prev,
                  error: '消息格式无效，插件无法正常工作',
                  isLoading: false,
                  isWaitingForUserId: false
                }));
                return;
              }

              console.log('[插件] ✅ 收到真实用户ID:', userId);
              console.log('[插件] 调用信息:', payload);
              
              // 清除初始化超时计时器，因为我们已经收到用户ID
              if (fallbackTimerRef.current) {
                clearTimeout(fallbackTimerRef.current);
                fallbackTimerRef.current = null;
                console.log('[插件] 已收到用户ID，清除初始化超时计时器');
              }
              
              try {
              // 设置用户ID
              setState(prev => ({ 
                ...prev, 
                currentUserId: userId,
                isWaitingForUserId: false
              }));

              // 进行权限检查（已在初始化时检查过历史数据）
              console.log('[插件] 第二步：无历史数据，进行权限检查');
              const hasPermission = await checkPermission(userId);
              console.log('[插件] 权限检查结果:', hasPermission);
              
              setState(prev => ({
                ...prev,
                hasPermission,
                isLoading: false
              }));

              if (!hasPermission) {
                console.warn('[插件] 第一次权限被拒绝，保存权限拒绝记录到聊天历史');
                
                // 生成API名称用于权限拒绝消息
                const apiName = config.name || '未知API';
                
                // 调用权限拒绝处理函数，保存到聊天记录
                await handlePermissionDenied(userId, apiName);

                return;
              }

              // 权限通过，获取数据
              console.log('[插件] 第三步：权限通过，获取数据');
              console.log('[插件] 收到参数，开始获取数据:', payload?.arguments);
              
              setState(prev => ({ ...prev, isLoading: true }));
              
              // 解析参数
              let params = {};
              if (payload?.arguments) {
                try {
                  params = typeof payload.arguments === 'string' 
                    ? JSON.parse(payload.arguments) 
                    : payload.arguments;
                } catch (error) {
                  console.warn('[插件] 参数解析失败:', error);
                }
              }
              
              await fetchData(params);
                
              } catch (error) {
                console.error('[插件] 初始化过程出错:', error);
                setState(prev => ({
                  ...prev,
                  error: '初始化失败',
                  isLoading: false,
                  isWaitingForUserId: false
                }));
              }
            }
          } catch (error) {
            console.error('[插件] 消息处理出错:', error);
            return; // 出错时直接返回，不影响其他消息处理
          }
        };

        messageHandlerRef.current = handleMessage;
        window.addEventListener('message', handleMessage);

        // 设置超时提示
        fallbackTimerRef.current = setTimeout(() => {
          setState(prev => {
            if (prev.isWaitingForUserId) {
              console.warn('[插件] ⏰ 等待Avaca推送超时');
              return {
                ...prev,
                error: '等待Avaca初始化超时，请刷新页面重试',
                isLoading: false,
                isWaitingForUserId: false
              };
            }
            return prev;
          });
        }, FRAMEWORK_CONFIG.TIMEOUTS.LOBECHAT_INIT);

        } catch (error) {
          console.error('[插件] 初始化失败:', error);
          isInitialized.current = false; // Reset on error
          setState(prev => ({ 
            ...prev, 
            error: '初始化失败', 
            isLoading: false 
          }));
          return undefined;
        } finally {
          initializationPromiseRef.current = null;
        }
      })();
      
      initializationPromiseRef.current = initPromise;
      await initPromise;
    };

    initialize();
    
    // 清理函数
    return () => {
      if (messageHandlerRef.current) {
        window.removeEventListener('message', messageHandlerRef.current);
        messageHandlerRef.current = null;
      }
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      isInitialized.current = false;
      initializationPromiseRef.current = null;
    };
  }, [checkPermission, fetchData, handlePermissionDenied, validateData, isPermissionDeniedData]);

  // 渲染内容
  const renderContent = React.useCallback(() => {
    if (state.isLoading) {
      return (
        <div style={{
          alignItems: 'center',
          color: '#94a3b8',
          display: 'flex',
          fontSize: '14px',
          height: '200px',
          justifyContent: 'center'
        }}>
          loading...
        </div>
      );
    }

    if (state.error) {
      return (
        <div style={{
          color: '#ef4444',
          fontSize: '14px',
          padding: '20px',
          textAlign: 'center'
        }}>
          错误: {state.error}
        </div>
      );
    }

    if (state.hasPermission === false) {
      return (
        <div style={{
          color: '#f59e0b',
          fontSize: '14px',
          padding: '20px',
          textAlign: 'center'
        }}>
          抱歉，您无权使用该工具
        </div>
      );
    }

    if (!state.data) {
      return (
        <div style={{
          color: '#94a3b8',
          fontSize: '14px',
          padding: '20px',
          textAlign: 'center'
        }}>
          暂无数据
        </div>
      );
    }

    // 处理权限拒绝数据的渲染
    if (isPermissionDeniedData(state.data)) {
      const deniedData = state.data as any;
      return (
        <div style={{
          background: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
          border: '1px solid #f59e0b',
          borderRadius: '8px',
          color: '#f59e0b',
          fontSize: '14px',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
            🚫 {deniedData.data.message || '抱歉，您无权使用该工具'}
          </div>
          <div style={{ color: '#9ca3af', fontSize: '12px', marginTop: '8px' }}>
            API: {deniedData.data.details?.apiName || '未知'}
          </div>
          <div style={{ color: '#6b7280', fontSize: '11px', marginTop: '4px' }}>
            {deniedData.data.details?.requiredPermissions || '请联系管理员获取访问权限'}
          </div>
        </div>
      );
    }

    // 处理正常业务数据的渲染
    try {
      return config.render({ 
        data: state.data, 
        onRenderComplete: handleRenderComplete,
        openDrawer
      });
    } catch (error) {
      console.error('[插件] 渲染失败:', error);
      return (
        <div style={{
          color: '#ef4444',
          fontSize: '14px',
          padding: '20px',
          textAlign: 'center'
        }}>
          渲染失败: {error instanceof Error ? error.message : '未知错误'}
        </div>
      );
    }
  }, [config, isPermissionDeniedData, openDrawer, state]);

  return (
    <div style={{
      background: 'transparent',
      borderRadius: '8px',
      minHeight: '160px',
      padding: '12px'
    }}>
      {renderContent()}
    </div>
  );
};

// ==================== 便捷函数 ====================

/**
 * 创建插件验证器
 */
export function createValidator<T>(schema: { 
  properties?: Record<string, any>; 
  required?: string[]; 
}): (data: unknown) => data is T {
  return (data: unknown): data is T => {
    if (!data || typeof data !== 'object') return false;
    
    const obj = data as any;
    
    // 检查必需字段
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in obj)) return false;
      }
    }
    
    // 检查属性结构
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (obj[key] !== undefined) {
          if (propSchema.required && Array.isArray(propSchema.required)) {
            for (const requiredField of propSchema.required) {
              if (!(requiredField in obj[key])) return false;
            }
          }
          if (propSchema.type === 'array' && !Array.isArray(obj[key])) return false;
          if (propSchema.type === 'string' && typeof obj[key] !== 'string') return false;
          if (propSchema.type === 'number' && typeof obj[key] !== 'number') return false;
        }
      }
    }
    
    return true;
  };
}

/**
 * 获取框架实例
 */
export function getFramework(): AvacaPluginFramework {
  return AvacaPluginFramework.getInstance();
}

/**
 * 注册插件
 */
export function registerPlugin<T>(config: PluginConfig<T>): void {
  getFramework().register(config);
}

/**
 * 渲染插件
 */
export function renderPlugin(name: string): React.ReactElement | null {
  return getFramework().renderPlugin(name);
}

// 导出框架实例
export const framework = getFramework();
