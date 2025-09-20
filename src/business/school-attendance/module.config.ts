/**
 * School Attendance 业务模块配置
 * 包含完整的模块配置信息，实现与框架完全分离
 */

import type { BusinessModuleConfig } from '@/framework';
import { registerBusinessModuleLoader } from '../auto-discovery';

// 导入前端组件（安全的前端代码）
import { 
  AttendanceSummaryRender
} from './components';

// 导入类型定义
import type { AttendanceDataResponse } from './types';

import React from 'react';

// 导入服务端处理器（仅在服务端使用）
import { handleAttendanceDataAPI } from './server-handlers';

/**
 * School Attendance 业务模块配置
 */
const schoolAttendanceModuleConfig: BusinessModuleConfig = {
  // API名称到端点的映射
  apiMappings: {
    'getSchoolAttendance': '/school-attendance/data'
  },
  
  moduleId: 'school-attendance',
  
  // 插件配置
  plugins: [
    // 学校考勤插件
    {
      apiHandler: handleAttendanceDataAPI,
      description: "学校考勤数据插件",
      endpoint: "/school-attendance/data",
      name: "School Attendance",
      render: ({ data, openDrawer, onRenderComplete }: { 
        data: AttendanceDataResponse; 
        onRenderComplete?: () => void;
        openDrawer: (title: string, data: any) => Promise<void>;
      }) => {
        return React.createElement(AttendanceSummaryRender, { data, onRenderComplete, openDrawer });
      },
      validator: (data: unknown): data is AttendanceDataResponse => {
        // 基础结构验证
        const hasBasicStructure = Boolean(data && typeof data === 'object' && 
               'data' in data && 
               (data as any).data && 
               typeof (data as any).data === 'object' &&
               'timestamp' in (data as any));
        
        if (!hasBasicStructure) {
          return false;
        }
        
        // 业务数据验证
        const dataObj = data as { data: any };
        
        const hasBusinessData = Boolean(
               dataObj.data &&
               typeof dataObj.data === 'object' &&
               'campus' in dataObj.data &&
               'date' in dataObj.data &&
               Array.isArray(dataObj.data.grades));
        
        return hasBusinessData;
      }
    }
  ],
  
  // 服务端专用处理器
  serverHandlers: {
    '/school-attendance/data': handleAttendanceDataAPI
  }
};

// 自动注册模块加载器
registerBusinessModuleLoader('school-attendance', async () => schoolAttendanceModuleConfig);

export default schoolAttendanceModuleConfig;


