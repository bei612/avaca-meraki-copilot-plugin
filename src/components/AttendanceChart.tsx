/**
 * 考勤图表组件 - 标准化实现
 */

import React from 'react';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import type { AttendanceData } from '../types';

interface AttendanceChartProps {
  data: AttendanceData;
  isHistoryView: boolean;
  onOpenDrawer: (title: string, data: any) => void;
}

export const AttendanceChart: React.FC<AttendanceChartProps> = ({ 
  data, 
  onOpenDrawer, 
  isHistoryView 
}) => {
  const { campus, trends } = data;

  // ECharts 配置
  const chartOption = {
    backgroundColor: 'transparent',
    grid: {
      bottom: '15%',
      left: '5%',
      right: '5%',
      top: '20%'
    },
    series: [{
      areaStyle: {
        color: {
          colorStops: [
            { color: 'rgba(139, 92, 246, 0.4)', offset: 0 },
            { color: 'rgba(79, 70, 229, 0.1)', offset: 1 }
          ],
          type: 'linear',
          x: 0,
          x2: 0,
          y: 0,
          y2: 1
        }
      },
      data: trends.map(item => item.rate),
      itemStyle: {
        color: '#8b5cf6'
      },
      lineStyle: {
        color: '#8b5cf6',
        width: 3
      },
      name: 'Attendance Rate',
      type: 'line'
    }],
    title: {
      left: 'center',
      text: '7-Day Attendance Trend',
      textStyle: {
        color: '#e9d5ff',
        fontSize: 16,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      backgroundColor: 'rgba(79, 70, 229, 0.9)',
      borderColor: 'rgba(139, 92, 246, 0.5)',
      formatter: (params: any) => {
        const data = params[0];
        const trend = trends[data.dataIndex];
        return `
          <div>
            <strong>${dayjs(trend.date).format('MM-DD')}</strong><br/>
            出勤率: <strong>${trend.rate}%</strong><br/>
            出勤人数: ${trend.present}/${trend.enrolled}
          </div>
        `;
      },
      textStyle: {
        color: '#e9d5ff'
      },
      trigger: 'axis'
    },
    xAxis: {
      axisLabel: {
        color: '#c4b5fd',
        fontSize: 12
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(139, 92, 246, 0.3)'
        }
      },
      data: trends.map(item => dayjs(item.date).format('MM-DD')),
      type: 'category'
    },
    yAxis: {
      axisLabel: {
        color: '#c4b5fd',
        fontSize: 12,
        formatter: '{value}%'
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(139, 92, 246, 0.3)'
        }
      },
      max: Math.max(...trends.map(t => t.rate)) + 2,
      min: Math.min(...trends.map(t => t.rate)) - 2,
      splitLine: {
        lineStyle: {
          color: 'rgba(139, 92, 246, 0.2)'
        }
      },
      type: 'value'
    }
  };

  // 点击图表显示详细数据
  const handleChartClick = () => {
    const detailData = trends.reduce((acc, item, index) => {
      // 生成随机详细数据
      const randomAbsent = item.enrolled - item.present;
      const randomLate = Math.floor(Math.random() * 15) + 5;
      const randomExcused = Math.floor(Math.random() * Math.min(randomAbsent, 8));
      const randomUnexcused = randomAbsent - randomExcused;

      acc[`Day ${index + 1} (${dayjs(item.date).format('MM-DD')})`] = {
        'Absent': randomAbsent,
        'Attendance Rate': `${item.rate}%`,
        'Date': item.date,
        'Excused Absences': randomExcused,
        'Late Arrivals': randomLate,
        'Present': item.present,
        'Special Events': Math.random() > 0.7 ? 
          ['School Assembly', 'Field Trip', 'Sports Day', 'Parent Meeting'][Math.floor(Math.random() * 4)] : 
          'None',
        'Total Enrolled': item.enrolled,
        'Unexcused Absences': randomUnexcused,
        'Weather': ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy'][Math.floor(Math.random() * 4)]
      };
      return acc;
    }, {} as any);

    onOpenDrawer('Attendance Trend Details', detailData);
  };

  return (
    <div style={{
      background: 'transparent',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      maxHeight: '480px',
      overflow: 'hidden',
      padding: '12px 8px',
      width: '100%'
    }}>
      {/* 标题 */}
      <div style={{
        color: '#e9d5ff',
        flexShrink: 0,
        fontSize: '16px',
        fontWeight: '600',
        marginBottom: '12px',
        textAlign: 'center'
      }}>
        {campus} – Middle School Attendance
        <div style={{
          color: '#c4b5fd',
          fontSize: '12px',
          fontWeight: 'normal',
          marginTop: '2px'
        }}>
          {dayjs().subtract(6, 'day').format('MMM D')} to {dayjs().format('MMM D')}
          {isHistoryView && (
            <span style={{ color: '#fbbf24', marginLeft: '8px' }}>
              (历史数据)
            </span>
          )}
        </div>
      </div>

      {/* 图表 */}
      <div 
        onClick={handleChartClick}
        style={{ 
          borderRadius: '8px',
          cursor: 'pointer',
          flex: 1,
          minHeight: '0',
          overflow: 'hidden',
          width: '100%'
        }}
      >
        <ReactECharts 
          lazyUpdate={true} 
          notMerge={true}
          option={chartOption}
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
      </div>
    </div>
  );
};
