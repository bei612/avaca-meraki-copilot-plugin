/**
 * 动态图表布局组件
 * 支持 1-N 个 ECharts 图表的自适应布局展示
 */

import React from 'react';
import ReactECharts from 'echarts-for-react';

interface EChartsDataItem {
  columns?: string[];
  data?: any;
  option?: any;
  title: string;
  type: string;
}

interface LayoutConfig {
  columns: number;
  grid_layout: string;
  spacing: number;
  total_charts: number;
}

interface DynamicChartsLayoutProps {
  charts: EChartsDataItem[];
  layout: LayoutConfig;
  metadata: {
    chart_types: string[];
    timestamp: number;
    title: string;
  };
  onChartClick?: (chart: EChartsDataItem, index: number) => void;
}

export const DynamicChartsLayout: React.FC<DynamicChartsLayoutProps> = ({
  charts,
  layout,
  metadata,
  onChartClick
}) => {
  // 计算图表容器样式 - 优化为每行最多2个图表
  const getChartContainerStyle = (index: number) => {
    // 每行最多2个图表的布局逻辑
    const currentRow = Math.floor(index / 2);
    const isLastRow = currentRow === Math.floor((charts.length - 1) / 2);
    const chartsInLastRow = charts.length % 2 === 0 ? 2 : 1;
    
    // 计算网格列位置
    let gridColumn = 'auto';
    
    if (charts.length === 1) {
      // 单个图表居中显示
      gridColumn = '1 / -1';
    } else if (isLastRow && chartsInLastRow === 1) {
      // 最后一行只有一个图表时居中显示
      gridColumn = '1 / -1';
    } else {
      // 正常的两列布局
      gridColumn = 'auto';
    }

    return {
      background: 'transparent',
      boxSizing: 'border-box' as const,
      cursor: onChartClick ? 'pointer' : 'default',
      display: 'flex',
      flexDirection: 'column' as const,
      gridColumn,
      height: '400px', // 固定高度，让图表完全撑满
      transition: 'all 0.3s ease',
      width: '100%'
    };
  };

  // 处理图表点击
  const handleChartClick = (chart: EChartsDataItem, index: number) => {
    if (onChartClick) {
      onChartClick(chart, index);
    }
  };

  // 渲染表格类型图表
  const renderTableChart = (chart: EChartsDataItem) => {
    if (!chart.columns || !chart.data) {
      return null; // 数据不完整时不显示任何内容
    }

    return (
      <div style={{
        boxSizing: 'border-box',
        fontSize: '11px',
        height: '100%',
        overflow: 'auto',
        width: '100%'
      }}>
        <table style={{
          borderCollapse: 'collapse',
          color: '#e6e6fa',
          height: '100%',
          width: '100%'
        }}>
          <thead>
            <tr>
              {chart.columns.map((col, i) => (
                <th key={i} style={{
                  backgroundColor: 'rgba(139, 92, 246, 0.1)',
                  color: '#c4b5fd',
                  fontSize: '10px',
                  fontWeight: '600',
                  padding: '6px 4px',
                  textAlign: 'left'
                }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chart.data.map((row: any[], rowIndex: number) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} style={{
                    fontSize: '9px',
                    padding: '4px',
                    textAlign: 'left'
                  }}>
                    {String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // 渲染 ECharts 图表
  const renderEChart = (chart: EChartsDataItem) => {
    if (!chart.option) {
      return null; // 配置缺失时不显示任何内容
    }

    return (
      <ReactECharts
        lazyUpdate={true}
        notMerge={true}
        option={chart.option}
        opts={{ 
          height: 'auto',
          renderer: 'canvas',
          width: 'auto'
        }}
        style={{ 
          height: '100%', 
          width: '100%'
        }}
      />
    );
  };

  // 渲染单个图表
  const renderChart = (chart: EChartsDataItem, index: number) => {
    return (
      <div
        key={index}
        onClick={() => handleChartClick(chart, index)}
        onMouseEnter={(e) => {
          if (onChartClick) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(138, 43, 226, 0.3)';
          }
        }}
        onMouseLeave={(e) => {
          if (onChartClick) {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }
        }}
        style={getChartContainerStyle(index)}
      >
        {/* 纯净的图表内容，无标题无边框 */}
        {chart.type === 'table' ? renderTableChart(chart) : renderEChart(chart)}
      </div>
    );
  };

  return (
    <div style={{
      background: 'transparent',
      boxSizing: 'border-box',
      padding: '16px',
      width: '100%'
    }}>
      {/* 整体标题 */}
      <div style={{
        color: '#ffffff',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <h2 style={{
          fontSize: '18px',
          fontWeight: 'bold',
          margin: '0 0 8px 0'
        }}>
          {metadata.title}
        </h2>
        <div style={{
          alignItems: 'center',
          color: '#c4b5fd',
          display: 'flex',
          flexWrap: 'wrap',
          fontSize: '12px',
          gap: '16px',
          justifyContent: 'center'
        }}>
          <span>共 {layout.total_charts} 个图表</span>
          <span>类型: {metadata.chart_types.join(', ')}</span>
          <span>{new Date(metadata.timestamp).toLocaleString()}</span>
        </div>
      </div>

      {/* 图表网格 */}
      <div style={{
        alignItems: 'stretch', // 改为 stretch 让图表高度一致
        boxSizing: 'border-box',
        display: 'grid',
        gap: `${layout.spacing}px`,
        gridTemplateColumns: layout.grid_layout,
        width: '100%' // 确保网格撑满宽度
      }}>
        {charts.map((chart, index) => renderChart(chart, index))}
      </div>

      {/* 空状态 */}
      {charts.length === 0 && (
        <div style={{
          color: '#9370db',
          padding: '60px 20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <div style={{ fontSize: '16px', marginBottom: '8px' }}>暂无图表数据</div>
          <div style={{ fontSize: '12px' }}>请先执行工作流获取数据</div>
        </div>
      )}
    </div>
  );
};
