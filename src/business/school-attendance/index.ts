/**
 * School Attendance 业务模块入口
 * 导出所有必要的类型和组件，自动注册模块
 */

// 导入模块配置（这会自动触发注册）
import './module.config';

// 导出前端组件和类型
export * from './components';

// 导出模块配置（用于测试和调试）
export { default as schoolAttendanceModuleConfig } from './module.config';


