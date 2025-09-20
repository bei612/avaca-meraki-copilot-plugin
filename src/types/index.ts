/**
 * 共享类型定义
 */

// 标准的 LobeChat 初始化数据结构 - 包含权限控制所需的userId
export interface LobeInitData {
  payload: {
    apiName: string;
    arguments: string;
    id: string;
    identifier: string;
    type: string;
  };
  settings?: Record<string, any>;   // 插件设置
  state?: Record<string, any>;      // 插件状态
  type: string;                    // 'lobe-chat:init-standalone-plugin'
  userId?: string;                  // 用户ID，用于权限控制
}

// 考勤数据结构
export interface AttendanceData {
  aiInstructions?: {
    analysisPrompt: string;
  };
  campus: string;
  date: string;
  trends: Array<{
    date: string;
    enrolled: number;
    present: number;
    rate: number;
  }>;
}
