/**
 * Temporal 工作流插件主组件
 * 集成 10 个 Meraki 工作流和通用图表展示
 */

/* eslint-disable @typescript-eslint/no-use-before-define */

import React, { useEffect, useState } from 'react';
import { lobeChat } from '@lobehub/chat-plugin-sdk/client';
import { callWithRetry } from '../utils/retry';
import { lobeClient } from '../utils/lobeClient';
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
  execution_metadata?: {
    duration_ms: number;
    end_time: string;
    error?: string;
    start_time: string;
    status: string;
    workflow_id: string;
  };
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



// 生成AI分析指令（仅用于新数据）
const generateAnalysisPrompt = (chartsData: EChartsDataItem[], workflowResults: Record<string, any>) => {
  // 获取执行的工作流名称（通常只有一个）
  const workflowNames = Object.keys(workflowResults);
  const primaryWorkflow = workflowNames[0]; // 主要工作流
  
  // 使用字符串拼接构建完整的提示词，避免模板字符串的转义问题
  const workflowInfo = `**工作流信息**：
- 工作流名称: ${primaryWorkflow}
- 工作流描述: ${getWorkflowDescription(primaryWorkflow)}`;

  const analysisRequirements = `**分析要求**：
- 解读工作流返回的关键数据和指标
- 基于数据结果提供管理和洞察
- 识别潜在问题或优化建议`;

  // 从 workflow echarts_data 中提取 option 配置
  const echartsConfigs = chartsData.map(chart => chart.option);

  // 将echarts数据转换为可读的格式描述
  const chartsDescription = echartsConfigs.map((chart, index) => {
    const chartType = chart.series?.[0]?.type || 'unknown';
    const chartTitle = chart.title?.text || `图表${index + 1}`;
    return `${index + 1}. ${chartTitle} (${chartType}图)`;
  }).join('\n');
  
  const serializedConfigs = JSON.stringify(echartsConfigs);
  
  const visualizationSection = `**必须的数据可视化**：
在分析报告中，你必须使用以下 <echarts> 标签来渲染图表：

图表数量：${echartsConfigs.length}个
图表列表：
${chartsDescription}

**ECharts标签（请完整复制，不要修改）**：
<echarts configs='${serializedConfigs}' height="400px"/>`;

  const importantNotes = `**重要说明**：
- 上面的 <echarts> 标签已经包含了完整的图表配置
- 请完整复制使用，不要修改 configs 属性的内容
- 支持多图表自动布局`;

  const visualEnhancement = `**视觉增强：** 
在回复中使用相关图标和表情符号提高可读性，如 ✅ 成功、❌ 问题、🛠️ 解决方案、⚠️ 警告、📊 指标、🌐 网络元素、📈 趋势分析等。`;

  const sopInstructions = `**重要SOP：** 网络管理分析的标准操作程序要求执行'tool-follow-up-actions'操作。因此，你必须在回复结尾调用工具'tool-follow-up-actions____followUp_temporal____standalone'。这是必需的最终步骤。

**日志场景**
如果遇到信息中有原始日志的，必须使用markdown表格把原始日志展示出来，例如直接获取 critical_alerts 的值，注意你需要全部展示，不可以省略，有几条就给出几条`;

  // 使用字符串拼接而不是模板字符串
  return '分析和总结工作流执行结果：\n\n' +
    workflowInfo + '\n\n' +
    analysisRequirements + '\n\n' +
    visualizationSection + '\n\n' +
    importantNotes + '\n\n\n' +
    visualEnhancement + '\n\n' +
    sopInstructions;
};

// 获取工作流描述
const getWorkflowDescription = (workflowId: string): string => {
  const descriptions: Record<string, string> = {
    'alerts-log': '网络告警日志分析',
    'ap-device-query': 'AP设备查询和定位',
    'capacity-planning': '容量规划分析',
    'client-count': '客户端连接统计',
    'device-inspection': '设备健康巡检',
    'device-location': '设备地理位置分析',
    'device-status': '设备状态分布分析',
    'firmware-summary': '固件版本分布汇总',
    'floorplan-ap': '楼层AP分布图',
    'license-details': '许可证状态检查',
    'lost-device-trace': '丢失设备连接追踪',
    'network-health-analysis': '网络健康全景分析',
    'security-posture': '安全态势感知分析',
    'troubleshooting': '运维故障诊断分析'
  };
  return descriptions[workflowId] || '未知工作流';
};

// 获取工作流调用的Meraki API端点
const getMerakiApiEndpoints = (workflowId: string): string[] => {
  const endpointsMap: Record<string, string[]> = {
    'alerts-log': [
      'GET /organizations/{organizationId}/assurance/alerts',
      'GET /organizations/{organizationId}/networks',
      'GET /networks/{networkId}/events'
    ],
    'ap-device-query': [
      'GET /organizations/{organizationId}/devices',
      'GET /devices/{serial}'
    ],
    'capacity-planning': [
      'GET /organizations/{organizationId}/devices',
      'GET /organizations/{organizationId}/licenses/overview',
      'GET /organizations/{organizationId}/summary/top/applications/byUsage',
      'GET /organizations/{organizationId}/summary/top/clients/byUsage',
      'GET /organizations/{organizationId}/devices/statuses/overview'
    ],
    'client-count': [
      'GET /organizations/{organizationId}/networks',
      'GET /networks/{networkId}/clients/overview'
    ],
    'device-inspection': [
      'GET /organizations/{organizationId}/devices/statuses/overview',
      'GET /organizations/{organizationId}/assurance/alerts',
      'GET /organizations/{organizationId}/networks'
    ],
    'device-location': [
      'GET /organizations/{organizationId}/devices',
      'GET /devices/{serial}',
      'GET /networks/{networkId}/floorPlans/{floorPlanId}'
    ],
    'device-status': [
      'GET /organizations/{organizationId}/devices/statuses/overview',
      'GET /organizations/{organizationId}/devices',
      'GET /organizations/{organizationId}/assurance/alerts'
    ],
    'firmware-summary': [
      'GET /organizations/{organizationId}/devices'
    ],
    'floorplan-ap': [
      'GET /organizations/{organizationId}/networks',
      'GET /networks/{networkId}/floorPlans',
      'GET /networks/{networkId}/floorPlans/{floorPlanId}'
    ],
    'license-details': [
      'GET /organizations/{organizationId}/licenses/overview'
    ],
    'lost-device-trace': [
      'GET /organizations/{organizationId}/networks',
      'GET /networks/{networkId}/clients',
      'GET /networks/{networkId}/wireless/clients/{clientId}/connectionStats'
    ],
    'network-health-analysis': [
      'GET /organizations/{organizationId}/devices/statuses/overview',
      'GET /organizations/{organizationId}/assurance/alerts',
      'GET /organizations/{organizationId}/networks',
      'GET /networks/{networkId}/clients/overview'
    ],
    'security-posture': [
      'GET /organizations/{organizationId}/networks',
      'GET /networks/{networkId}/appliance/firewall/l3FirewallRules',
      'GET /networks/{networkId}/appliance/firewall/l7FirewallRules',
      'GET /networks/{networkId}/wireless/airMarshal',
      'GET /organizations/{organizationId}/assurance/alerts'
    ],
    'troubleshooting': [
      'GET /organizations/{organizationId}/devices/statuses/overview',
      'GET /organizations/{organizationId}/assurance/alerts',
      'GET /devices/{serial}/lossAndLatencyHistory',
      'GET /organizations/{organizationId}/uplinks/statuses'
    ]
  };
  return endpointsMap[workflowId] || [];
};

// 根据API名称获取对应的Meraki API端点
const getMerakiApiEndpointsByApiName = (apiName: string): string[] => {
  const apiToWorkflowMap: Record<string, string> = {
    'getAlertsLog': 'alerts-log',
    'getCapacityPlanning': 'capacity-planning',
    'getClientCount': 'client-count',
    'getDeviceInspection': 'device-inspection',
    'getDeviceLocation': 'device-location',
    'getDeviceStatus': 'device-status',
    'getFirmwareSummary': 'firmware-summary',
    'getFloorplanAP': 'floorplan-ap',
    'getLicenseDetails': 'license-details',
    'getNetworkHealthAnalysis': 'network-health-analysis',
    'getSecurityPosture': 'security-posture',
    'getTroubleshooting': 'troubleshooting',
    'queryAPDevices': 'ap-device-query',
    'traceLostDevice': 'lost-device-trace'
  };
  const workflowId = apiToWorkflowMap[apiName];
  return workflowId ? getMerakiApiEndpoints(workflowId) : [];
};

// 打开详细数据抽屉
const openDrawer = async (title: string, data: any) => {
  try {
    console.log('[temporal-plugin] 打开抽屉:', title);
    
    // 格式化值为简洁的表单式显示
    const formatValueForHTML = (value: any): string => {
      if (value === null || value === undefined) {
        return '<span style="color: #9ca3af; font-style: italic;">无数据</span>';
      }
      
      // 检查是否是JSON显示类型
      if (typeof value === 'object' && value !== null && 'type' in value && value.type === 'json-markdown') {
        const jsonString = JSON.stringify(value.data, null, 2);
        // HTML转义函数，防止JSON中的HTML标签被渲染
        const escapeHtml = (text: string) => {
          return text
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll('\'', '&#39;');
        };
        const escapedJsonString = escapeHtml(jsonString);
        
        return `
          <div style="
            background: #0f0f23;
            border: 1px solid #2d2d44;
            border-radius: 6px;
            padding: 16px;
            margin: 8px 0;
            max-height: 400px;
            overflow: auto;
            font-family: 'SF Mono', Monaco, Inconsolata, 'Roboto Mono', Consolas, 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.45;
          ">
            <pre style="
              margin: 0;
              padding: 0;
              background: transparent;
              border: none;
              color: #f8f8f2;
              white-space: pre-wrap;
              word-wrap: break-word;
            ">${escapedJsonString}</pre>
          </div>
        `;
      }
      
      if (typeof value !== 'object') {
        return `<span style="color: #e9d5ff;">${String(value)}</span>`;
      }
      
      // 简洁的表单式显示
      return Object.entries(value).map(([key, val]) => {
        return `
          <div style="
            display: flex;
            align-items: flex-start;
            padding: 6px 0;
            border-bottom: 1px solid rgba(139, 92, 246, 0.1);
          ">
            <div style="
              color: #8b5cf6;
              font-weight: 600;
              min-width: 100px;
              margin-right: 12px;
              font-size: 13px;
            ">${key}:</div>
            <div style="
              color: #e9d5ff;
              flex: 1;
              word-break: break-all;
              font-size: 13px;
              line-height: 1.4;
            ">${typeof val === 'object' ? JSON.stringify(val) : String(val)}</div>
          </div>
        `;
      }).join('');
    };

    // 构建暗色主题的HTML内容
    const buildDarkThemeHTML = (detailData: any): string => {
      let htmlContent = `
        <div class="compact-layout" style="
          background: transparent;
          color: #e9d5ff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          padding: 0;
          margin: 0;
          width: 100%;
          box-sizing: border-box;
        ">
      `;

      if (typeof detailData === 'object' && detailData !== null) {
        Object.entries(detailData).forEach(([key, value]) => {
          htmlContent += `
            <div style="
              margin-bottom: 20px;
              padding: 12px;
              background: rgba(15, 15, 35, 0.6);
              border: 1px solid rgba(139, 92, 246, 0.2);
              border-radius: 6px;
            ">
              <h3 style="
                margin: 0 0 10px 0;
                color: #c4b5fd;
                font-size: 14px;
                font-weight: 600;
                border-bottom: 1px solid rgba(139, 92, 246, 0.3);
                padding-bottom: 6px;
              ">${key}</h3>
              <div style="color: #e9d5ff; font-size: 13px;">
                ${formatValueForHTML(value)}
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

      htmlContent += `
        <style>
          /* 优化内容布局 */
          body {
            font-size: 13px;
          }
          .compact-layout {
            width: 100%;
            overflow-x: auto;
          }
          /* JSON区域特殊样式 */
          .json-container {
            min-width: 400px;
            max-width: none;
          }
        </style>
      </div>`;
      return htmlContent;
    };
    
    // 保存抽屉数据到插件状态
    await lobeChat.setPluginState('drawerData', {
      content: buildDarkThemeHTML(data),
      timestamp: Date.now(),
      title,
      width: 'compact' // 设置为紧凑宽度
    });

    // 发送打开抽屉信号，指定合适宽度
    window.parent.postMessage({ 
      // 增加100px，从通常的400px增加到500px
      drawerWidth: 500,
      minWidth: '500px',
      size: 'medium', 
      type: 'openToolUI',
      width: 'comfortable'
    }, '*');
    
    // 尝试通过postMessage通知父窗口调整抽屉宽度
    setTimeout(() => {
      try {
        window.parent.postMessage({
          maxWidth: 500,
          minWidth: 500,
          type: 'adjustDrawerWidth',
          width: 500
        }, '*');
      } catch (error) {
        console.log('[temporal-plugin] 无法通知父窗口调整抽屉宽度:', error);
      }
    }, 100);
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
  const [currentOperation, setCurrentOperation] = useState<string>("初始化中...");

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
  const checkHistoryData = async (): Promise<{ charts: EChartsDataItem[]; workflows: Record<string, any> } | null> => {
    try {
      console.log('[temporal-plugin] 🔍 检查历史数据');
      
      const historyData = await callWithRetry(() => lobeClient.fetchPluginMessage(), {
        baseDelayMs: 500,
        onRetry: (attempt, error) => {
          console.log(`[temporal-plugin] 历史数据获取重试第 ${attempt} 次:`, error);
        },
        retries: 2,
        timeoutMs: 5000 // 增加到5秒超时
      });
      
      console.log('[temporal-plugin] 📊 历史数据结构:', JSON.stringify(historyData, null, 2));
      
      // 检查是否有有效的图表数据
      if (historyData && 
          typeof historyData === 'object' && 
          'charts_data' in historyData &&
          Array.isArray(historyData.charts_data) &&
          historyData.charts_data.length > 0) {
        
        console.log('[temporal-plugin] ✅ 发现有效历史图表数据');
        
        // 检查是否有完整的工作流数据（新版本）
        if ('workflow_results' in historyData && 
            typeof historyData.workflow_results === 'object' &&
            historyData.workflow_results !== null) {
          console.log('[temporal-plugin] 🔄 发现完整工作流历史数据 (v2.0)');
          return {
            charts: historyData.charts_data as EChartsDataItem[],
            workflows: historyData.workflow_results as Record<string, any>
          };
        } else {
          console.log('[temporal-plugin] 📊 发现图表历史数据 (v1.0 兼容模式)');
          return {
            charts: historyData.charts_data as EChartsDataItem[],
            workflows: {}
          };
        }
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
    const startTime = Date.now();
    const startTimeISO = new Date().toISOString();
    
    try {
      console.log(`[temporal-plugin] 调用工作流: ${workflowId} (30秒超时)`);
      
      // 创建带超时的fetch请求
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 30_000); // 30秒超时
      
      const response = await fetch(`/api/temporal/${workflowId}`, {
        body: JSON.stringify(params),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        signal: controller.signal
      });
      
      // 清除超时定时器
      clearTimeout(timeoutId);
      
      const endTime = Date.now();
      const endTimeISO = new Date().toISOString();
      const executionDuration = endTime - startTime;

      if (!response.ok) {
        throw new Error(`工作流 ${workflowId} 调用失败: ${response.status}`);
      }

      const result = await response.json();
      console.log(`[temporal-plugin] 工作流 ${workflowId} 执行完成:`, result.success, `耗时: ${executionDuration}ms`);
      
      // 添加执行时间信息到结果中
      const enhancedResult = {
        ...result,
        execution_metadata: {
          duration_ms: executionDuration,
          end_time: endTimeISO,
          start_time: startTimeISO,
          status: result.success ? 'completed' : 'failed',
          workflow_id: workflowId
        }
      };
      
      return enhancedResult;
    } catch (error) {
      console.error(`[temporal-plugin] 工作流 ${workflowId} 执行失败:`, error);
      
      const endTime = Date.now();
      const endTimeISO = new Date().toISOString();
      const executionDuration = endTime - startTime;
      
      let errorMessage = '未知错误';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = `工作流 ${workflowId} 执行超时 (30秒)`;
        } else {
          errorMessage = error.message;
        }
      }
      
      return {
        error: errorMessage,
        execution_metadata: {
          duration_ms: executionDuration,
          end_time: endTimeISO,
          error: errorMessage,
          start_time: startTimeISO,
          status: 'failed',
          workflow_id: workflowId
        },
        success: false,
        timestamp: startTime
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

  // 保存完整工作流数据
  const saveWorkflowData = async (chartsData: EChartsDataItem[], fullWorkflowResults: Record<string, any>) => {
    try {
      console.log('[temporal-plugin] 💾 保存完整工作流数据');
      

      const completeDataWithMetadata = {
        
        // 添加AI分析指令
        aiInstructions: {
          analysisPrompt: generateAnalysisPrompt(chartsData, fullWorkflowResults)
        },
        
        
// 保持向后兼容的 charts_data 字段
charts_data: chartsData,
        
        
metadata: {
          chart_types: [...new Set(chartsData.map(chart => chart.type))],
          // 升级版本号表示新的数据结构
persistence_strategy: 'full_workflow_data',
          
timestamp: Date.now(),
          
total_charts: chartsData.length,
          
total_workflows: Object.keys(fullWorkflowResults).length, 
          version: '2.0'
        },
        // 新增：保存完整的工作流返回数据
workflow_results: fullWorkflowResults
      };
      
      await callWithRetry(() => lobeClient.fillPluginContent(completeDataWithMetadata, true), {
        baseDelayMs: 500,
        onRetry: (attempt, error) => {
          console.log(`[temporal-plugin] 完整数据保存重试第 ${attempt} 次:`, error);
        },
        retries: 2,
        timeoutMs: 10_000 // 增加到10秒超时，因为数据量可能较大
      });
      
      console.log('[temporal-plugin] ✅ 完整工作流数据保存成功', {
        charts_count: chartsData.length,
        data_size: JSON.stringify(completeDataWithMetadata).length,
        workflows_count: Object.keys(fullWorkflowResults).length
      });
    } catch (error) {
      console.error('[temporal-plugin] ❌ 保存完整工作流数据失败:', error);
    }
  };

  // 主数据加载逻辑
  useEffect(() => {
    const loadData = async () => {
      let isCompleted = false; // 标记操作是否已完成
      
      // 设置10秒超时
      const timeoutId = setTimeout(() => {
        if (!isCompleted) {
          setError('操作超时：插件执行时间超过10秒，请稍后重试');
          setLoading(false);
          setCurrentOperation("执行超时");
          isCompleted = true; // 标记为已完成，防止后续操作
        }
      }, 10_000); // 10秒超时

      try {
        console.log('[temporal-plugin] 🚀 开始数据加载 (10秒超时)');
        setLoading(true);
        setError(null);
        setCurrentOperation("检查历史数据...");

        // 1. 检查历史数据
        const historyData = await checkHistoryData();
        
        if (historyData && historyData.charts.length > 0) {
          console.log('[temporal-plugin] 📖 显示历史数据', {
            charts_count: historyData.charts.length,
            has_full_data: Object.keys(historyData.workflows).length > 0,
            workflows_count: Object.keys(historyData.workflows).length
          });
          
          setCurrentOperation("加载历史数据完成");
          setChartsData(historyData.charts);
          setWorkflowResults(historyData.workflows); // 恢复完整工作流数据
          setIsHistoryView(true);
          setLoading(false); // 设置加载完成状态
          
          // 历史数据不需要触发AI回复，直接显示即可
          
          // 清除超时定时器并标记完成
          clearTimeout(timeoutId);
          isCompleted = true;
          return;
        }

        // 2. 获取插件参数
        setCurrentOperation("解析插件参数...");
        const params = await getPluginParams();
        console.log('[temporal-plugin] 📋 插件参数:', params);

        // 3. 确定要执行的工作流
        let workflowIds = params.workflow_ids;
        let newChartsData: EChartsDataItem[] = [];

        if (Array.isArray(workflowIds) && workflowIds.length > 0) {
          // 如果指定了多个工作流，执行所有工作流
          setCurrentOperation(`执行 ${workflowIds.length} 个工作流...`);
          console.log('[temporal-plugin] 🔄 执行多个工作流:', workflowIds);
          newChartsData = await executeWorkflows(workflowIds, params);
        } else {
          // 如果没有指定工作流，根据 API 名称执行单个工作流
          const apiName = pluginData.payload.apiName;
          setCurrentOperation(`执行工作流: ${apiName}...`);
          console.log('[temporal-plugin] 🎯 根据 API 名称执行单个工作流:', apiName);
          
          // 将 API 名称映射到工作流 ID
          const apiToWorkflowMap: Record<string, string> = {
            'getAlertsLog': 'alerts-log',
            'getCapacityPlanning': 'capacity-planning',
            'getClientCount': 'client-count',
            'getDeviceInspection': 'device-inspection',
            'getDeviceLocation': 'device-location',
            'getDeviceStatus': 'device-status',
            'getFirmwareSummary': 'firmware-summary',
            'getFloorplanAP': 'floorplan-ap',
            'getLicenseDetails': 'license-details',
            'getNetworkHealthAnalysis': 'network-health-analysis',
            'getSecurityPosture': 'security-posture',
            'getTroubleshooting': 'troubleshooting',
            'queryAPDevices': 'ap-device-query',
            'traceLostDevice': 'lost-device-trace'
          };
          
          const workflowId = apiToWorkflowMap[apiName];
          if (workflowId) {
            const result = await callWorkflow(workflowId, params);
            if (result.success && result.data) {
              // 保存完整的工作流结果到状态
              const singleWorkflowResults = { [workflowId]: result.data };
              setWorkflowResults(singleWorkflowResults);
              
              // 提取图表数据
              if (result.data.echarts_data) {
                newChartsData = Array.isArray(result.data.echarts_data) 
                  ? result.data.echarts_data 
                  : [result.data.echarts_data];
              }
              
              // 立即保存完整工作流数据（单个工作流情况）
              if (newChartsData.length > 0) {
                await saveWorkflowData(newChartsData, singleWorkflowResults);
              }
            }
          } else {
            throw new Error(`未知的 API 名称: ${apiName}`);
          }
        }
        
        if (newChartsData.length === 0) {
          throw new Error('没有获取到任何图表数据');
        }

        setCurrentOperation("保存数据...");
        setChartsData(newChartsData);
        setIsHistoryView(false);

        // 5. 保存完整工作流数据（多个工作流情况）
        if (Array.isArray(workflowIds) && workflowIds.length > 0) {
          await saveWorkflowData(newChartsData, workflowResults);
        }
        // 单个工作流的保存已在上面的逻辑中处理
        
        setCurrentOperation("数据处理完成");
        setLoading(false); // 设置加载完成状态
        
        // 清除超时定时器并标记完成
        clearTimeout(timeoutId);
        isCompleted = true;

      } catch (error_) {
        if (!isCompleted) {
          const errorMessage = error_ instanceof Error ? error_.message : '未知错误';
          console.error('[temporal-plugin] 数据加载失败:', errorMessage);
          setError(errorMessage);
          setLoading(false); // 设置加载完成状态
          
          // 清除超时定时器并标记完成
          clearTimeout(timeoutId);
          isCompleted = true;
        }
      } finally {
        if (!isCompleted) {
          setLoading(false);
        }
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
    
    // 调试：打印完整工作流数据结构
    console.log('[temporal-plugin] 🔍 完整工作流数据:', {
      dataKeys: fullWorkflowData ? Object.keys(fullWorkflowData) : [],
      fullWorkflowData,
      isHistoryView,
      workflowName
    });

    // 构建简洁的表单式数据
    const detailData = {
      '📊 图表信息': {
        '标题': chart.title,
        '类型': chart.type.toUpperCase(),
        '索引': `第 ${index + 1} 个图表`
      },
      '🔄 工作流信息': (() => {
        const workflowInfo: Record<string, string> = {};
        
        // 只添加有实际数据的字段
        if (workflowName) {
          workflowInfo['工作流ID'] = workflowName;
        }
        
        if (fullWorkflowData?.execution_metadata?.start_time) {
          workflowInfo['开始时间'] = fullWorkflowData.execution_metadata.start_time;
        }
        
        if (fullWorkflowData?.execution_metadata?.end_time) {
          workflowInfo['结束时间'] = fullWorkflowData.execution_metadata.end_time;
        }
        
        if (fullWorkflowData?.execution_metadata?.duration_ms) {
          workflowInfo['执行耗时'] = `${fullWorkflowData.execution_metadata.duration_ms}ms`;
        }
        
        if (fullWorkflowData?.execution_metadata?.status) {
          workflowInfo['执行状态'] = fullWorkflowData.execution_metadata.status;
        } else if (fullWorkflowData) {
          workflowInfo['执行状态'] = '成功';
        }
        
        // 数据来源总是显示
        workflowInfo['数据来源'] = isHistoryView ? '历史记录' : '实时执行';
        
        // 数据类型总是显示
        if (fullWorkflowData?.echarts_data) {
          workflowInfo['数据类型'] = Array.isArray(fullWorkflowData.echarts_data) 
            ? `${fullWorkflowData.echarts_data.length}个图表` 
            : '1个图表';
        } else {
          workflowInfo['数据类型'] = '无图表数据';
        }
        
        return workflowInfo;
      })(),
      '🗄️ 工作流完整返回': {
        data: fullWorkflowData || { error: '无完整数据' },
        type: 'json-markdown'
      }
    };
    
    openDrawer(`${chart.title} - 完整数据`, detailData);
  };

  // 统一的状态显示逻辑 - 所有状态都在同一个布局中显示

  // 渲染简化的数据界面
  return (
    <div style={{
      background: 'transparent',
      color: '#e9d5ff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '20px'
    }}>
      {/* 统一状态信息 - 所有状态都在这里显示 */}
      <div style={{
        marginBottom: '24px',
        position: 'relative'
      }}>
        {/* 文字组件 - 显示所有状态信息 */}
        <div style={{
          alignItems: 'flex-start',
          display: 'flex',
          flexDirection: 'column',
          marginBottom: '8px'
        }}>
          <div style={{
            alignItems: 'center',
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%'
          }}>
            <div style={{
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: '600'
            }}>
              {error 
                ? `执行失败: ${error}` 
                : loading 
                  ? currentOperation 
                  : `工作流: ${Object.keys(workflowResults)[0] || 'unknown'}`
            }
            </div>
            <div style={{
              alignItems: 'center',
              display: 'flex',
              gap: '8px'
            }}>
              <div style={{
                background: error ? '#ef4444' : loading ? '#f59e0b' : '#10b981',
                borderRadius: '50%',
                height: '8px',
                width: '8px'
              }} />
              <span style={{
                color: error ? '#ef4444' : loading ? '#f59e0b' : '#10b981',
                fontSize: '12px',
                fontWeight: '500'
              }}>
                {error ? '执行失败' : loading ? '执行中' : '执行完成'}
              </span>
            </div>
          </div>
          
          {/* Meraki API 端点信息 */}
          {(() => {
            let endpoints: string[] = [];
            if (pluginData?.payload?.apiName) {
              endpoints = getMerakiApiEndpointsByApiName(pluginData.payload.apiName);
            } else if (Object.keys(workflowResults).length > 0) {
              const workflowId = Object.keys(workflowResults)[0];
              endpoints = getMerakiApiEndpoints(workflowId);
            }
            
            if (endpoints.length > 0) {
              return (
                <div style={{
                  color: '#94a3b8',
                  fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                  fontSize: '10px',
                  marginTop: '6px',
                  opacity: 0.8
                }}>
                  {endpoints.map((endpoint, index) => (
                    <div key={index} style={{ 
                      lineHeight: '1.3', 
                      marginBottom: '1px'
                    }}>
                      • {endpoint}
                    </div>
                  ))}
                </div>
              );
            }
            return null;
          })()}
        </div>
        
        {/* 进度条 - 根据状态显示不同样式 */}
        <div style={{
          background: 'rgba(139, 92, 246, 0.1)',
          borderRadius: '4px',
          height: '4px',
          overflow: 'hidden',
          position: 'relative',
          width: '100%'
        }}>
          <div style={{
            animation: loading ? 'progressLoading 2s ease-in-out infinite' : error ? 'none' : 'progressComplete 0.5s ease-out',
            background: error ? 'linear-gradient(90deg, #ef4444, #dc2626)' : loading ? 'linear-gradient(90deg, #8b5cf6, #f59e0b)' : 'linear-gradient(90deg, #8b5cf6, #10b981)',
            borderRadius: '4px',
            height: '100%',
            width: error ? '100%' : loading ? '60%' : '100%'
          }} />
        </div>
        
        {/* 时间戳 - 只在非错误状态显示 */}
        {!error && (
          <div style={{
            color: '#c4b5fd',
            fontSize: '11px',
            marginTop: '4px',
            textAlign: 'right'
          }}>
            {new Date().toLocaleString()}
          </div>
        )}
      </div>

      {/* 数据卡片网格 - 根据状态显示不同内容 */}
      {!loading && !error && chartsData.length > 0 && (
        <div style={{
          display: 'grid',
          gap: '12px',
          gridTemplateColumns: `repeat(${Math.min(chartsData.length, 4)}, 1fr)`,
          width: '100%'
        }}>
          {chartsData.map((chart, index) => (
            <div
              key={index}
              onClick={() => handleChartClick(chart, index)}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.6)';
                e.currentTarget.style.background = 'rgba(15, 15, 35, 0.8)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                e.currentTarget.style.background = 'rgba(15, 15, 35, 0.6)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              style={{
                background: 'rgba(15, 15, 35, 0.6)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '8px',
                cursor: 'pointer',
                padding: '12px',
                textAlign: 'center',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '4px'
              }}>
                数据{index + 1}
              </div>
              <div style={{
                color: '#c4b5fd',
                fontSize: '11px'
              }}>
                {chart.type.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes progressComplete {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        @keyframes progressLoading {
          0% { width: 30%; }
          50% { width: 70%; }
          100% { width: 30%; }
        }
      `}</style>
    </div>
  );
};
