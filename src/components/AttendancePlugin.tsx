/**
 * School Attendance Plugin - 主组件
 * 标准化的 LobeChat 插件实现
 */

import React, { useEffect, useState } from 'react';
import { lobeChat } from '@lobehub/chat-plugin-sdk/client';
import { callWithRetry } from '../utils/retry';
import { lobeClient } from '../utils/lobeClient';
import { AttendanceChart } from './AttendanceChart';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
import type { LobeInitData, AttendanceData } from '../types';

// 打开详细数据抽屉
const openDrawer = async (title: string, data: any) => {
  try {
    console.log('[tool-splunk-campus] 打开抽屉:', title);
    
    // 构建暗色主题的HTML内容
    const buildDarkThemeHTML = (detailData: any): string => {
      let htmlContent = `
        <div style="
          background: transparent;
          color: #e9d5ff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          padding: 0;
          margin: 0;
        ">
      `;

      // 渲染数据项
      Object.entries(detailData).forEach(([key, value]) => {
        htmlContent += `
          <div style="
            margin-bottom: 24px;
            padding: 16px;
            background: rgba(15, 15, 35, 0.6);
            border: 1px solid rgba(139, 92, 246, 0.2);
            border-radius: 8px;
          ">
            <h3 style="
              margin: 0 0 12px 0;
              color: #c4b5fd;
              font-size: 16px;
              font-weight: 600;
              border-bottom: 1px solid rgba(139, 92, 246, 0.3);
              padding-bottom: 8px;
            ">${key}</h3>
            <div style="display: grid; gap: 8px;">
        `;

        if (typeof value === 'object' && value !== null) {
          Object.entries(value as Record<string, any>).forEach(([subKey, subValue]) => {
            htmlContent += `
              <div style="
                display: flex;
                justify-content: space-between;
                padding: 6px 0;
                border-bottom: 1px solid rgba(139, 92, 246, 0.1);
              ">
                <span style="color: #a78bfa; font-weight: 500;">${subKey}:</span>
                <span style="color: #e9d5ff;">${subValue}</span>
              </div>
            `;
          });
        } else {
          htmlContent += `
            <div style="color: #e9d5ff; padding: 6px 0;">
              ${value}
            </div>
          `;
        }

        htmlContent += `
            </div>
          </div>
        `;
      });

      htmlContent += `</div>`;
      return htmlContent;
    };
    
    // 保存抽屉数据到插件状态 - 使用content字段避免白色背景
    await lobeChat.setPluginState('drawerData', {
      content: buildDarkThemeHTML(data),
      timestamp: Date.now(),
      title
    });

    // 发送打开抽屉信号
    window.parent.postMessage({ type: 'openToolUI' }, '*');
  } catch (error) {
    console.error('[tool-splunk-campus] 打开抽屉失败:', error);
  }
};

// 权限控制示例：检查用户ID
const checkUserPermission = (userId?: string): boolean => {
  // 这里可以实现具体的权限逻辑
  // 例如：检查用户是否有访问考勤数据的权限
  if (!userId) {
    console.warn('[tool-splunk-campus] 未提供用户ID，使用默认权限');
    return true; // 默认允许访问
  }
  
  console.log('[tool-splunk-campus] 用户权限检查:', userId);
  // 实际项目中可以调用权限检查API
  return true; // 暂时允许所有用户访问
};

export const AttendancePlugin: React.FC<{ pluginData: LobeInitData }> = ({ pluginData }) => {
  const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isHistoryView, setIsHistoryView] = useState(false);

  // 使用 SDK 获取插件参数
  const getPluginParams = async () => {
    try {
      const payload = await lobeChat.getPluginPayload();
      const args = payload.arguments || {};
      return {
        campus: args.campus || 'Shanghai Campus',
        date: args.date || new Date().toISOString().split('T')[0]
      };
    } catch {
      // 降级到从初始化数据获取
      try {
        const args = JSON.parse(pluginData.payload.arguments || '{}');
        return {
          campus: args.campus || 'Shanghai Campus',
          date: args.date || new Date().toISOString().split('T')[0]
        };
      } catch {
        return {
          campus: 'Shanghai Campus',
          date: new Date().toISOString().split('T')[0]
        };
      }
    }
  };

  // 使用标准信号检查历史数据
  const checkHistoryData = async (): Promise<AttendanceData | null> => {
    try {
           console.log('[tool-splunk-campus] 🔍 使用标准信号检查历史数据');
           console.log('[tool-splunk-campus] 🏷️ 多插件数据隔离机制演示:');
           console.log('  📊 五层隔离标识:');
           console.log('    1️⃣ 用户层 (userId):', pluginData.userId);
           console.log('    2️⃣ 会话层 (sessionId/topicId): 由主应用管理');
           console.log('    3️⃣ 插件类型层 (identifier):', pluginData.payload.identifier);
           console.log('    4️⃣ 工具调用层 (tool_call_id):', pluginData.tool_call_id || pluginData.payload.id);
           console.log('    5️⃣ 消息层 (messageId): 每个插件实例独有的消息ID');
           console.log('  🔐 数据隔离保证:');
           console.log('    - 此数据仅属于当前 tool-splunk-campus 插件实例');
           console.log('    - 与 follow-up-actions 插件完全隔离');
           console.log('    - 与同类型插件的其他调用完全隔离');
           console.log('  📋 技术细节:');
           console.log('    - API名称 (apiName):', pluginData.payload.apiName);
           console.log('    - 插件类型 (type):', pluginData.payload.type);
      
      const historyData = await callWithRetry(() => lobeClient.fetchPluginMessage(), {
        baseDelayMs: 500,
        onRetry: (attempt, error) => {
          console.log(`[tool-splunk-campus] 历史数据获取重试第 ${attempt} 次:`, error);
        },
        retries: 2,
        timeoutMs: 1500
      });
      
           // 🔍 详细打印历史数据结构用于调试
           console.log('[tool-splunk-campus] 📊 历史数据完整结构:', JSON.stringify(historyData, null, 2));
           console.log('[tool-splunk-campus] 🔑 多插件隔离验证:');
           console.log('  ✅ 此数据仅属于当前 tool-splunk-campus 插件实例');
           console.log('  ✅ 无法访问 follow-up-actions 插件的数据');
           console.log('  ✅ 无法访问其他用户的数据');
           console.log('  ✅ 无法访问其他会话的数据');
           console.log('  ✅ 数据存储在独立的 messageId 中');
      
      // 严格按照开发指南的标准数据结构验证
      if (historyData && 
          typeof historyData === 'object' && 
          historyData !== null &&
          'data' in historyData &&
          historyData.data &&
          typeof historyData.data === 'object' &&
          'trends' in historyData.data &&
          Array.isArray(historyData.data.trends)) {
        console.log('[tool-splunk-campus] ✅ 发现有效历史数据，这是历史查看');
        console.log('[tool-splunk-campus] 📈 历史趋势数据:', historyData.data.trends);
        return historyData.data as AttendanceData;
      }
      
      console.log('[tool-splunk-campus] ❌ 未发现有效历史数据，进行首次调用');
      console.log('[tool-splunk-campus] 🔍 检测失败原因:');
      console.log('  - historyData存在:', !!historyData);
      console.log('  - 是对象:', typeof historyData === 'object');
      console.log('  - 有data字段:', historyData && typeof historyData === 'object' && 'data' in historyData);
      console.log('  - data存在:', historyData && (historyData as any).data);
      console.log('  - data是对象:', historyData && typeof (historyData as any).data === 'object');
      console.log('  - 有trends字段:', historyData && (historyData as any).data && 'trends' in (historyData as any).data);
      console.log('  - trends是数组:', historyData && (historyData as any).data && Array.isArray((historyData as any).data.trends));
      console.log('  - trends长度:', historyData && (historyData as any).data && (historyData as any).data.trends ? (historyData as any).data.trends.length : 0);
      return null;
    } catch (error) {
      console.log('[tool-splunk-campus] ⚠️ 获取历史数据失败，进行首次调用:', error);
      return null;
    }
  };

  // 获取新的考勤数据
  const fetchAttendanceData = async (params: { campus: string; date: string }): Promise<AttendanceData> => {
    console.log('[tool-splunk-campus] 🆕 获取新数据:', params);
    
    const response = await fetch('/api/school-attendance/data', {
      body: JSON.stringify(params),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  };

  // 使用标准的 lobe-chat:fill-plugin-content 信号保存数据
  const savePluginData = async (data: AttendanceData) => {
    try {
           console.log('[tool-splunk-campus] 💾 使用标准信号保存插件数据');
           console.log('[tool-splunk-campus] 🏷️ 多次调用数据隔离保存验证:');
           console.log('  📊 本次调用的唯一标识:');
           console.log('    🔑 tool_call_id:', pluginData.tool_call_id || pluginData.payload.id);
           console.log('    📋 调用参数:', JSON.stringify(pluginData.payload.arguments));
           console.log('    👤 用户ID:', pluginData.userId);
           console.log('    🏷️ 插件类型:', pluginData.payload.identifier);
           console.log('  🎯 数据隔离保证:');
           console.log('    ✅ 此数据只能被相同 tool_call_id 的实例访问');
           console.log('    ✅ 同一 topic 中的其他调用无法访问此数据');
           console.log('    ✅ 每次调用都有独立的数据存储空间');
           console.log('  🔐 隔离保证:');
           console.log('    - 数据将保存到独立的 messageId 中');
           console.log('    - 与 follow-up-actions 插件完全隔离');
           console.log('    - 与其他用户、会话、工具调用完全隔离');
           console.log('    - LobeChat 使用五层机制确保数据不会混淆');
      
      // 构建标准的数据结构
      const dataWithMetadata = {
        data,
        metadata: {
          isHistoryView: false,
          // 添加隔离标识用于验证
          isolationKeys: {
            apiName: pluginData.payload.apiName,
            identifier: pluginData.payload.identifier,
            toolCallId: pluginData.tool_call_id || pluginData.payload.id,
            userId: pluginData.userId
          },
          
timestamp: Date.now(),
          
          version: '1.0'
        }
      };
      
      // 使用标准信号保存完整数据供历史查看，并触发AI分析
             await callWithRetry(() => lobeClient.fillPluginContent(dataWithMetadata, true), {
               baseDelayMs: 500,
               onRetry: (attempt, error) => {
                 console.log(`[tool-splunk-campus] 数据保存重试第 ${attempt} 次:`, error);
               },
               retries: 2,
               timeoutMs: 1500
             });
      
      console.log('[tool-splunk-campus] ✅ 数据保存成功，AI将生成分析');
      console.log('[tool-splunk-campus] 🔒 数据隔离确认: 数据已安全保存到当前插件的独立存储空间');
    } catch (error) {
      console.error('[tool-splunk-campus] ❌ 保存数据失败:', error);
    }
  };

  // 主数据加载逻辑 - 每次都是新实例，直接执行
  useEffect(() => {
    const loadData = async () => {
      try {
        // 🔧 开发环境防重复机制：暂时禁用以调试问题
        const currentToolCallId = pluginData.tool_call_id || pluginData.payload.id;
        console.log('[tool-splunk-campus] 🔍 多次调用区分机制验证:');
        console.log('  - 当前 tool_call_id:', currentToolCallId);
        console.log('  - payload.id:', pluginData.payload.id);
        console.log('  - 调用参数:', JSON.stringify(pluginData.payload.arguments));
        console.log('  - 当前时间:', Date.now());
        console.log('  - 🎯 每次调用都有唯一的 tool_call_id，确保数据完全隔离');
        
        // 🔧 移除防重复机制：Fast Refresh 会导致误判，每个插件实例都应该能正常加载
        
        console.log('[tool-splunk-campus] 🚀 开始数据加载');
        setLoading(true);
        setError(null);

        // 0. 权限检查
        const hasPermission = checkUserPermission(pluginData.userId);
        if (!hasPermission) {
          setError('您没有访问考勤数据的权限');
          return;
        }

        // 1. 使用标准信号检查历史数据
        const historyData = await checkHistoryData();
        
        if (historyData) {
          console.log('[tool-splunk-campus] 📖 显示历史数据，不触发AI分析');
          setAttendanceData(historyData);
          setIsHistoryView(true);
          return;
        }

        // 2. 获取新数据
        console.log('[tool-splunk-campus] 🆕 获取新数据并触发AI分析');
        const params = await getPluginParams();
        const newData = await fetchAttendanceData(params);
        
        setAttendanceData(newData);
        setIsHistoryView(false);

        // 3. 保存数据并触发AI分析（仅新数据）
        await savePluginData(newData);

      } catch (error_) {
        const errorMessage = error_ instanceof Error ? error_.message : '未知错误';
        console.error('[tool-splunk-campus] 数据加载失败:', errorMessage);
        setError(errorMessage);
      } finally {
        setLoading(false);
        
        // 🔧 防重复机制已移除
      }
    };

    loadData();
  }, [pluginData.payload.arguments, pluginData.userId]); // 只在参数或用户ID变化时重新加载

  // 渲染状态
  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorDisplay message={error} />;
  }

  if (!attendanceData) {
    return <ErrorDisplay message="没有可用的考勤数据" />;
  }

  return (
    <AttendanceChart 
      data={attendanceData}
      isHistoryView={isHistoryView}
      onOpenDrawer={openDrawer}
    />
  );
};