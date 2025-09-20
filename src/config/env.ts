/**
 * 环境变量配置
 * 提供统一的环境变量访问和默认值
 * 
 * 使用说明：
 * 1. 根据实际需求配置环境变量
 * 2. 重启开发服务器使配置生效
 */

export const ENV_CONFIG = {
  // ==================== API 配置 ====================
  /** API基础URL，用于业务API调用 */
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || '',
  
  /** API请求超时时间（毫秒） */
  apiTimeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '10000', 10),

  // ==================== 权限配置 ====================
  /** 是否默认允许所有用户访问 */
  defaultAccess: process.env.NEXT_PUBLIC_DEFAULT_ACCESS === 'true',
  
  /** 是否启用动态权限检查 */
  enableDynamicPermissions: process.env.NEXT_PUBLIC_ENABLE_DYNAMIC_PERMISSIONS === 'true',

  
  
  // ==================== API级别权限配置 ====================
/** API级别权限配置，支持多种配置模式 */
getApiPermissions: (): Record<string, string[] | 'ALLOW_ALL' | 'DENY_ALL'> => {
    const permissions: Record<string, string[] | 'ALLOW_ALL' | 'DENY_ALL'> = {};
    
    // 🔧 临时解决方案：直接硬编码权限配置
    permissions['meraki_organization_networks'] = ['admin', '80a78507-22e3-4284-a852-9255057af933', '65dbe390-13e0-46ff-840b-8b2bd50c423e', 'c2f33cee-64a3-4c95-828e-c1e24c009861', '1f898ac5-fcbd-4488-b674-0402bd184055'];
    permissions['getwebaccesslogs'] = ['admin', '80a78507-22e3-4284-a852-9255057af933', '65dbe390-13e0-46ff-840b-8b2bd50c423e', 'c2f33cee-64a3-4c95-828e-c1e24c009861', '1f898ac5-fcbd-4488-b674-0402bd184055'];
    permissions['digital_safety_data'] = ['admin', '80a78507-22e3-4284-a852-9255057af933', '65dbe390-13e0-46ff-840b-8b2bd50c423e', 'c2f33cee-64a3-4c95-828e-c1e24c009861', '1f898ac5-fcbd-4488-b674-0402bd184055'];
    permissions['digital_safety'] = ['admin', '80a78507-22e3-4284-a852-9255057af933', '65dbe390-13e0-46ff-840b-8b2bd50c423e', 'c2f33cee-64a3-4c95-828e-c1e24c009861', '1f898ac5-fcbd-4488-b674-0402bd184055'];
    permissions['school_attendance'] = ['admin', '80a78507-22e3-4284-a852-9255057af933', '65dbe390-13e0-46ff-840b-8b2bd50c423e', 'c2f33cee-64a3-4c95-828e-c1e24c009861', '1f898ac5-fcbd-4488-b674-0402bd184055'];
    permissions['school_attendance_data'] = ['admin', '80a78507-22e3-4284-a852-9255057af933', '65dbe390-13e0-46ff-840b-8b2bd50c423e', 'c2f33cee-64a3-4c95-828e-c1e24c009861', '1f898ac5-fcbd-4488-b674-0402bd184055'];
    permissions['getschoolattendance'] = ['admin', '80a78507-22e3-4284-a852-9255057af933', '65dbe390-13e0-46ff-840b-8b2bd50c423e', 'c2f33cee-64a3-4c95-828e-c1e24c009861', '1f898ac5-fcbd-4488-b674-0402bd184055'];
    
    // 扫描所有以 NEXT_PUBLIC_API_PERMISSION_ 开头的环境变量
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('NEXT_PUBLIC_API_PERMISSION_')) {
        const apiName = key.replace('NEXT_PUBLIC_API_PERMISSION_', '').toLowerCase();
        const rawValue = process.env[key];
        
        if (rawValue === undefined) {
          // 未定义：不设置权限，使用全局权限
          return;
        }
        
        if (rawValue === '') {
          // 空字符串：允许所有用户
          permissions[apiName] = 'ALLOW_ALL';

          return;
        }
        
        if (rawValue.toLowerCase() === 'none' || rawValue.toLowerCase() === 'deny') {
          // 明确拒绝所有用户
          permissions[apiName] = 'DENY_ALL';

          return;
        }
        
        // 用户列表：解析用户ID列表
        const userList = rawValue.split(',').map(id => id.trim()).filter(id => id.length > 0);

        
        if (userList.length > 0) {
          permissions[apiName] = userList;

        } else {
          // 只有逗号等无效内容，视为允许所有用户
          permissions[apiName] = 'ALLOW_ALL';

        }
      }
    });
    

    return permissions;
  },
  
  
  

// ==================== 环境配置 ====================
/** 是否为开发环境 */
isDevelopment: process.env.NODE_ENV === 'development',

  
  
  

/** 是否为生产环境 */
isProduction: process.env.NODE_ENV === 'production',
  
  
  

// ==================== 插件配置 ====================
/** 插件唯一标识符 */
pluginId: process.env.NEXT_PUBLIC_PLUGIN_ID || 'avaca-plugin',

  
  
    /** 全局用户白名单，逗号分隔的用户ID列表 */
  pluginWhitelist: (() => {
    const rawValue = process.env.NEXT_PUBLIC_PLUGIN_WHITELIST;

    
    // 🔧 修复：正确处理包含引号的空字符串
    if (!rawValue || rawValue === "''" || rawValue === '""' || rawValue.trim() === '') {

      return [];
    }
    
    const parsed = rawValue.split(',').map(id => id.trim()).filter(id => id.length > 0 && id !== "''" && id !== '""');

    return parsed;
  })(),
} as const;

export type EnvConfig = typeof ENV_CONFIG;
