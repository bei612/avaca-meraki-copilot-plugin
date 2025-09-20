/**
 * 业务模块自动发现系统
 * 自动扫描和注册所有业务模块，实现框架与业务完全分离
 */

import { getFramework, type BusinessModuleConfig } from '@/framework';

// 业务模块注册表 - 自动维护
const businessModuleRegistry = new Map<string, () => Promise<BusinessModuleConfig>>();

/**
 * 注册业务模块加载器
 * 业务模块调用此函数进行自注册
 */
export function registerBusinessModuleLoader(
  moduleId: string, 
  loader: () => Promise<BusinessModuleConfig>
): void {
  businessModuleRegistry.set(moduleId, loader);
}

/**
 * 自动发现并注册所有业务模块
 * 框架调用此函数完成自动注册
 */
export async function discoverAndRegisterBusinessModules(): Promise<void> {
  const framework = getFramework();
  
  // 并行加载所有业务模块
  const loadPromises = Array.from(businessModuleRegistry.entries()).map(async ([moduleId, loader]) => {
    try {
      const moduleConfig = await loader();
      framework.registerBusinessModule(moduleConfig);
    } catch (error) {
      console.error(`[自动发现] 业务模块加载失败: ${moduleId}`, error);
    }
  });
  
  await Promise.all(loadPromises);
}

/**
 * 获取已注册的业务模块列表
 */
export function getRegisteredModules(): string[] {
  return Array.from(businessModuleRegistry.keys());
}
