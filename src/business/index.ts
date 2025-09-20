/**
 * 业务注册中心
 * 使用自动发现系统，无需手动注册业务模块
 * 业务开发者只需要在业务模块目录中创建模块即可
 */

import { discoverAndRegisterBusinessModules } from './auto-discovery';

// 导入所有业务模块（触发自动注册）
import './school-attendance'; // 导入学校考勤模块

/**
 * 自动发现并注册所有业务模块
 * 替代原来的手动注册方式
 */
export async function registerAllBusinessPlugins(): Promise<void> {
  await discoverAndRegisterBusinessModules();
}


