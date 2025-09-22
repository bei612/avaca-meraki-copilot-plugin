/**
 * Temporal 工作流插件主组件
 * 集成 10 个 Meraki 工作流和通用图表展示
 */

import React, { useEffect, useState } from 'react';
import { lobeChat } from '@lobehub/chat-plugin-sdk/client';
import { callWithRetry } from '../utils/retry';
import { lobeClient } from '../utils/lobeClient';
import { DynamicChartsLayout } from './DynamicChartsLayout';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
import type { LobeInitData } from '../types';

interface EChartsDataItem {
  columns?: string[];
  data?: any;
  option?: any;
  title: string;
  type: string;
}

interface WorkflowResult {
  data?: any;
  error?: string;
  success: boolean;
  timestamp: number;
}

// 工作流配置（暂时注释，后续可用于UI展示）
// const WORKFLOW_CONFIGS = [
//   { id: 'device-status', name: '设备状态查询', description: '获取整体设备运行状态分布' },
//   { id: 'ap-device-query', name: 'AP设备查询', description: '查询指定关键词的AP设备状态' },
//   { id: 'client-count', name: '客户端统计', description: '统计各网络的客户端数量' },
//   { id: 'firmware-summary', name: '固件版本汇总', description: '汇总不同型号的固件版本' },
//   { id: 'license-details', name: '许可证详情', description: '查询当前授权状态详情' },
//   { id: 'device-inspection', name: '设备巡检报告', description: '生成最新的设备巡检报告' },
//   { id: 'floorplan-ap', name: '楼层AP分布', description: '查询楼层的AP分布图' },
//   { id: 'device-location', name: '设备点位图', description: '获取设备的点位图信息' },
//   { id: 'lost-device-trace', name: '丢失设备追踪', description: '追踪丢失设备的连接历史' },
//   { id: 'alerts-log', name: '告警日志', description: '列出当前的告警日志' }
// ];

// 打开详细数据抽屉
const openDrawer = async (title: string, data: any) => {
  try {
    console.log('[temporal-plugin] 打开抽屉:', title);
    
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

      if (typeof detailData === 'object' && detailData !== null) {
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
              <div style="color: #e9d5ff; font-size: 14px;">
                ${typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
              </div>
            </div>
          `;
        });
      } else {
        htmlContent += `
          <div style="color: #e9d5ff; padding: 16px; font-size: 14px;">
            ${String(detailData)}
          </div>
        `;
      }

      htmlContent += `</div>`;
      return htmlContent;
    };
    
    // 保存抽屉数据到插件状态
    await lobeChat.setPluginState('drawerData', {
      content: buildDarkThemeHTML(data),
      timestamp: Date.now(),
      title
    });

    // 发送打开抽屉信号
    window.parent.postMessage({ type: 'openToolUI' }, '*');
  } catch (error) {
    console.error('[temporal-plugin] 打开抽屉失败:', error);
  }
};

export const TemporalPlugin: React.FC<{ pluginData: LobeInitData }> = ({ pluginData }) => {
  const [chartsData, setChartsData] = useState<EChartsDataItem[]>([]);
  const [workflowResults, setWorkflowResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isHistoryView, setIsHistoryView] = useState(false);

  // 使用 SDK 获取插件参数
  const getPluginParams = async () => {
    try {
      const payload = await lobeChat.getPluginPayload();
      const args = payload.arguments || {};
      return {
        client_mac: args.client_mac || null,
        floor_name: args.floor_name || null,
        org_id: args.org_id || "850617379619606726",
        search_keyword: args.search_keyword || "H330",
        workflow_ids: args.workflow_ids || []
      };
    } catch {
      // 降级到从初始化数据获取
      try {
        const args = JSON.parse(pluginData.payload.arguments || '{}');
        return {
          client_mac: args.client_mac || null,
          floor_name: args.floor_name || null,
          org_id: args.org_id || "850617379619606726",
          search_keyword: args.search_keyword || "H330",
          workflow_ids: args.workflow_ids || []
        };
      } catch {
        return {
          client_mac: null,
          floor_name: null,
          org_id: "850617379619606726",
          search_keyword: "H330",
          workflow_ids: []
        };
      }
    }
  };

  // 检查历史数据
  const checkHistoryData = async (): Promise<EChartsDataItem[] | null> => {
    try {
      console.log('[temporal-plugin] 🔍 检查历史数据');
      
      const historyData = await callWithRetry(() => lobeClient.fetchPluginMessage(), {
        baseDelayMs: 500,
        onRetry: (attempt, error) => {
          console.log(`[temporal-plugin] 历史数据获取重试第 ${attempt} 次:`, error);
        },
        retries: 2,
        timeoutMs: 1500
      });
      
      console.log('[temporal-plugin] 📊 历史数据结构:', JSON.stringify(historyData, null, 2));
      
      // 检查是否有有效的图表数据
      if (historyData && 
          typeof historyData === 'object' && 
          'charts_data' in historyData &&
          Array.isArray(historyData.charts_data) &&
          historyData.charts_data.length > 0) {
        console.log('[temporal-plugin] ✅ 发现有效历史图表数据');
        return historyData.charts_data as EChartsDataItem[];
      }
      
      console.log('[temporal-plugin] ❌ 未发现有效历史数据');
      return null;
    } catch (error) {
      console.log('[temporal-plugin] ⚠️ 获取历史数据失败:', error);
      return null;
    }
  };

  // 调用单个工作流
  const callWorkflow = async (workflowId: string, params: any): Promise<WorkflowResult> => {
    try {
      console.log(`[temporal-plugin] 调用工作流: ${workflowId}`);
      
      const response = await fetch(`/api/temporal/${workflowId}`, {
        body: JSON.stringify(params),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`工作流 ${workflowId} 调用失败: ${response.status}`);
      }

      const result = await response.json();
      console.log(`[temporal-plugin] 工作流 ${workflowId} 执行完成:`, result.success);
      
      return result;
    } catch (error) {
      console.error(`[temporal-plugin] 工作流 ${workflowId} 执行失败:`, error);
      return {
        error: error instanceof Error ? error.message : '未知错误',
        success: false,
        timestamp: Date.now()
      };
    }
  };

  // 执行多个工作流并收集图表数据
  const executeWorkflows = async (workflowIds: string[], params: any): Promise<EChartsDataItem[]> => {
    const allChartsData: EChartsDataItem[] = [];
    const allResults: Record<string, any> = {};
    
    for (const workflowId of workflowIds) {
      try {
        const result = await callWorkflow(workflowId, params);
        
        if (result.success && result.data) {
          // 保存完整的工作流结果
          allResults[workflowId] = result.data;
          
          // 收集图表数据
          if (result.data.echarts_data) {
            const workflowCharts = Array.isArray(result.data.echarts_data) 
              ? result.data.echarts_data 
              : [result.data.echarts_data];
            
            allChartsData.push(...workflowCharts);
          }
        }
      } catch (error) {
        console.error(`[temporal-plugin] 工作流 ${workflowId} 处理失败:`, error);
      }
    }
    
    // 保存所有工作流结果
    setWorkflowResults(allResults);
    
    return allChartsData;
  };

  // 保存图表数据
  const saveChartsData = async (chartsData: EChartsDataItem[]) => {
    try {
      console.log('[temporal-plugin] 💾 保存图表数据');
      
      const dataWithMetadata = {
        charts_data: chartsData,
        metadata: {
          chart_types: [...new Set(chartsData.map(chart => chart.type))],
          timestamp: Date.now(),
          total_charts: chartsData.length,
          version: '1.0'
        }
      };
      
      await callWithRetry(() => lobeClient.fillPluginContent(dataWithMetadata, true), {
        baseDelayMs: 500,
        onRetry: (attempt, error) => {
          console.log(`[temporal-plugin] 数据保存重试第 ${attempt} 次:`, error);
        },
        retries: 2,
        timeoutMs: 1500
      });
      
      console.log('[temporal-plugin] ✅ 图表数据保存成功');
    } catch (error) {
      console.error('[temporal-plugin] ❌ 保存图表数据失败:', error);
    }
  };

  // 主数据加载逻辑
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('[temporal-plugin] 🚀 开始数据加载');
        setLoading(true);
        setError(null);

        // 1. 检查历史数据
        const historyCharts = await checkHistoryData();
        
        if (historyCharts && historyCharts.length > 0) {
          console.log('[temporal-plugin] 📖 显示历史图表数据');
          setChartsData(historyCharts);
          setIsHistoryView(true);
          return;
        }

        // 2. 获取插件参数
        const params = await getPluginParams();
        console.log('[temporal-plugin] 📋 插件参数:', params);

        // 3. 确定要执行的工作流
        let workflowIds = params.workflow_ids;
        let newChartsData: EChartsDataItem[] = [];

        if (Array.isArray(workflowIds) && workflowIds.length > 0) {
          // 如果指定了多个工作流，执行所有工作流
          console.log('[temporal-plugin] 🔄 执行多个工作流:', workflowIds);
          newChartsData = await executeWorkflows(workflowIds, params);
        } else {
          // 如果没有指定工作流，根据 API 名称执行单个工作流
          const apiName = pluginData.payload.apiName;
          console.log('[temporal-plugin] 🎯 根据 API 名称执行单个工作流:', apiName);
          
          // 将 API 名称映射到工作流 ID
          const apiToWorkflowMap: Record<string, string> = {
            'getAlertsLog': 'alerts-log',
            'getClientCount': 'client-count',
            'getDeviceInspection': 'device-inspection',
            'getDeviceLocation': 'device-location',
            'getDeviceStatus': 'device-status',
            'getFirmwareSummary': 'firmware-summary',
            'getFloorplanAP': 'floorplan-ap',
            'getLicenseDetails': 'license-details',
            'queryAPDevices': 'ap-device-query',
            'traceLostDevice': 'lost-device-trace'
          };
          
          const workflowId = apiToWorkflowMap[apiName];
          if (workflowId) {
            const result = await callWorkflow(workflowId, params);
            if (result.success && result.data) {
              // 保存完整的工作流结果
              setWorkflowResults({ [workflowId]: result.data });
              
              // 提取图表数据
              if (result.data.echarts_data) {
                newChartsData = Array.isArray(result.data.echarts_data) 
                  ? result.data.echarts_data 
                  : [result.data.echarts_data];
              }
            }
          } else {
            throw new Error(`未知的 API 名称: ${apiName}`);
          }
        }
        
        if (newChartsData.length === 0) {
          throw new Error('没有获取到任何图表数据');
        }

        setChartsData(newChartsData);
        setIsHistoryView(false);

        // 5. 保存图表数据
        await saveChartsData(newChartsData);

      } catch (error_) {
        const errorMessage = error_ instanceof Error ? error_.message : '未知错误';
        console.error('[temporal-plugin] 数据加载失败:', errorMessage);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [pluginData.payload.arguments, pluginData.userId]);

  // 处理图表点击
  const handleChartClick = (chart: EChartsDataItem, index: number) => {
    console.log('[temporal-plugin] 图表点击:', chart.title, index);
    
    // 查找对应的工作流完整数据
    let fullWorkflowData = null;
    let workflowName = '';
    
    // 遍历所有工作流结果，找到包含当前图表的工作流
    for (const [workflowId, workflowData] of Object.entries(workflowResults)) {
      if (workflowData && workflowData.echarts_data) {
        const charts = Array.isArray(workflowData.echarts_data) 
          ? workflowData.echarts_data 
          : [workflowData.echarts_data];
        
        // 检查是否包含当前图表（通过标题匹配）
        if (charts.some((c: any) => c.title === chart.title && c.type === chart.type)) {
          fullWorkflowData = workflowData;
          workflowName = workflowId;
          break;
        }
      }
    }
    
    // 构建完整的详细数据
    const detailData = {
      '📊 图表信息': {
        '标题': chart.title,
        '类型': chart.type.toUpperCase(),
        '索引': `第 ${index + 1} 个图表`
      },
      '📋 图表原始数据': chart.data || '无原始数据',
      '🔄 工作流信息': {
        '工作流ID': workflowName || '未知',
        '执行状态': fullWorkflowData ? '成功' : '数据缺失',
        '数据来源': isHistoryView ? '历史缓存' : '实时执行'
      },
      '🗄️ 工作流完整返回': fullWorkflowData || '无完整数据'
    };
    
    openDrawer(`${chart.title} - 完整数据`, detailData);
  };

  // 渲染状态
  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorDisplay message={error} />;
  }

  if (chartsData.length === 0) {
    return <ErrorDisplay message="没有可用的图表数据" />;
  }

  // 构建布局配置 - 每行最多2个图表
  const layoutConfig = {
    columns: chartsData.length === 1 ? 1 : 2, // 最多2列
    grid_layout: chartsData.length === 1 ? '1fr' : 'repeat(2, 1fr)', // 1列或2列布局
    spacing: 20, // 增加间距以适应更大的图表
    total_charts: chartsData.length
  };

  const metadata = {
    chart_types: [...new Set(chartsData.map(chart => chart.type))],
    timestamp: Date.now(),
    title: isHistoryView ? 
      `工作流数据面板 (历史数据)` : 
      `工作流数据面板`
  };

  return (
    <DynamicChartsLayout
      charts={chartsData}
      layout={layoutConfig}
      metadata={metadata}
      onChartClick={handleChartClick}
    />
  );
};
