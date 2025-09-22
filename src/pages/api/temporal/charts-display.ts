/**
 * 通用 ECharts 数据展示 API
 * 接收多个 echarts_data 字段，返回统一的图表展示数据
 */

import type { NextApiRequest, NextApiResponse } from 'next';

interface EChartsDataItem {
  columns?: string[];
  data?: any;
  option?: any;
  title: string;
  type: string;
}

interface ChartsDisplayRequest {
  echarts_data_list: EChartsDataItem[];
  layout_config?: {
    columns?: number;
    spacing?: number;
    title?: string;
  };
}

interface ChartsDisplayResponse {
  data?: {
    charts: EChartsDataItem[];
    layout: {
      columns: number;
      grid_layout: string;
      spacing: number;
      total_charts: number;
    };
    metadata: {
      chart_types: string[];
      timestamp: number;
      title: string;
    };
  };
  error?: string;
  success: boolean;
  timestamp: number;
}

// 内存限流器
class RateLimiter {
  private static cache = new Map<string, { count: number; resetTime: number }>();

  static check(key: string, maxRequests = 10, windowMs = 30_000): boolean {
    const now = Date.now();
    const record = this.cache.get(key);
    
    if (!record || now > record.resetTime) {
      this.cache.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }
    
    if (record.count >= maxRequests) {
      return false;
    }
    
    record.count++;
    return true;
  }
}

// 计算最优布局
function calculateOptimalLayout(chartCount: number): { columns: number; rows: number } {
  if (chartCount === 1) return { columns: 1, rows: 1 };
  if (chartCount === 2) return { columns: 2, rows: 1 };
  if (chartCount === 3) return { columns: 3, rows: 1 };
  if (chartCount === 4) return { columns: 2, rows: 2 };
  if (chartCount <= 6) return { columns: 3, rows: 2 };
  if (chartCount <= 9) return { columns: 3, rows: 3 };
  return { columns: 4, rows: Math.ceil(chartCount / 4) };
}

// 标准化图表数据
function normalizeChartData(chartData: EChartsDataItem, index: number): EChartsDataItem {
  const normalized: EChartsDataItem = {
    ...chartData,
    title: chartData.title || `图表 ${index + 1}`,
    type: chartData.type || 'unknown'
  };

  // 确保每个图表都有完整的 option 配置
  if (!normalized.option && normalized.data) {
    // 为没有 option 的图表生成基础配置
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    normalized.option = generateBasicOption(normalized);
  }

  return normalized;
}

// 生成基础图表配置
function generateBasicOption(chartData: EChartsDataItem): any {
  const baseOption = {
    backgroundColor: 'transparent',
    textStyle: {
      color: '#e6e6fa',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    },
    title: {
      left: 'center',
      text: chartData.title,
      textStyle: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      backgroundColor: 'rgba(26, 26, 46, 0.95)',
      borderColor: '#6a5acd',
      borderWidth: 1,
      textStyle: {
        color: '#ffffff'
      }
    }
  };

  switch (chartData.type) {
    case 'table': {
      // 表格类型转换为简单的文本显示
      return {
        ...baseOption,
        graphic: {
          left: 'center',
          style: {
            fill: '#ffffff',
            fontSize: 16,
            text: '表格数据'
          },
          top: 'middle',
          type: 'text'
        }
      };
    }

    case 'pie': {
      return {
        ...baseOption,
        series: [{
          center: ['50%', '60%'],
          data: chartData.data || [],
          radius: ['30%', '70%'],
          type: 'pie'
        }]
      };
    }

    case 'bar': {
      return {
        ...baseOption,
        series: [{
          data: chartData.data || [],
          type: 'bar'
        }],
        xAxis: { data: [], type: 'category' },
        yAxis: { type: 'value' }
      };
    }

    default: {
      return baseOption;
    }
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChartsDisplayResponse>
) {
  try {
    // 限流检查
    const clientIP = req.headers['x-forwarded-for'] as string || req.connection.remoteAddress || 'unknown';
    if (!RateLimiter.check(clientIP)) {
      return res.status(429).json({
        error: '请求过于频繁，请稍后再试',
        success: false,
        timestamp: Date.now()
      });
    }

    // 只允许 POST 请求
    if (req.method !== 'POST') {
      return res.status(405).json({
        error: '不支持的请求方法',
        success: false,
        timestamp: Date.now()
      });
    }

    // 解析请求参数
    const params: ChartsDisplayRequest = req.body || {};
    const echarts_data_list = params.echarts_data_list || [];
    const layout_config = params.layout_config || {};

    console.log('[charts-display-api] 处理图表展示请求:', {
      chart_count: echarts_data_list.length,
      chart_types: echarts_data_list.map(item => item.type)
    });

    // 验证输入数据
    if (!Array.isArray(echarts_data_list) || echarts_data_list.length === 0) {
      return res.status(400).json({
        error: '请提供有效的 echarts_data_list 数组',
        success: false,
        timestamp: Date.now()
      });
    }

    if (echarts_data_list.length > 12) {
      return res.status(400).json({
        error: '图表数量不能超过12个',
        success: false,
        timestamp: Date.now()
      });
    }

    // 标准化图表数据
    const normalizedCharts = echarts_data_list.map((chartData, index) => 
      normalizeChartData(chartData, index)
    );

    // 计算布局
    const optimalLayout = calculateOptimalLayout(normalizedCharts.length);
    const columns = layout_config.columns || optimalLayout.columns;
    const spacing = layout_config.spacing || 16;

    // 构建响应数据
    const responseData = {
      charts: normalizedCharts,
      layout: {
        columns,
        grid_layout: `repeat(${columns}, 1fr)`,
        spacing,
        total_charts: normalizedCharts.length
      },
      metadata: {
        chart_types: [...new Set(normalizedCharts.map(chart => chart.type))],
        timestamp: Date.now(),
        title: layout_config.title || `数据可视化面板 (${normalizedCharts.length}个图表)`
      }
    };

    console.log('[charts-display-api] 图表数据处理完成:', {
      layout_columns: responseData.layout.columns,
      total_charts: responseData.layout.total_charts,
      unique_types: responseData.metadata.chart_types.length
    });

    // 设置响应头
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    return res.status(200).json({
      data: responseData,
      success: true,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('[charts-display-api] 图表展示API处理失败:', error);

    return res.status(500).json({
      error: error instanceof Error ? error.message : '服务器内部错误',
      success: false,
      timestamp: Date.now()
    });
  }
}
