/**
 * School Attendance 前端组件 - 简化版
 * 直接展示 7-Day Attendance Trend 图表
 */

import React, { useState, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';

// 类型导入
import { 
  AttendanceDataResponse, 
  AttendanceTrend,
  SplunkApiCall
} from './types';

/**
 * 模拟数据滚动展示组件
 */
const DataRoller: React.FC<{ data: string[]; interval?: number }> = ({ data, interval = 300 }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % data.length);
    }, interval);

    return () => clearInterval(timer);
  }, [data.length, interval]);

  return (
    <div style={{
      color: '#a78bfa',
      fontFamily: 'monospace',
      fontSize: '10px',
      overflow: 'hidden',
      whiteSpace: 'nowrap'
    }}>
      {data[currentIndex]}
    </div>
  );
};

/**
 * 考勤API调用过程展示组件
 */
interface AttendanceApiCallRenderProps {
  apiCalls: SplunkApiCall[];
  onComplete: () => void;
}

export const AttendanceApiCallRender: React.FC<AttendanceApiCallRenderProps> = ({ apiCalls, onComplete }) => {
  const [currentCalls, setCurrentCalls] = useState<SplunkApiCall[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // 模拟数据用于滚动展示
  const mockDataSamples = {
    'splunk:auth:validate': [
      'Validating authentication token...',
      'Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      'Verifying permissions...',
      'Token validated for user: attendance_service',
      'Access level: read-only'
    ],
    'splunk:connect': [
      'Establishing secure connection...',
      'Resolving hostname: splunk.company.internal',
      'Connecting to 192.168.10.15:8089',
      'TLS handshake in progress...',
      'Connection established successfully'
    ],
    'splunk:indexes:list': [
      'Retrieving index list...',
      'Found 8 indexes',
      'Filtering attendance-related indexes...',
      'Selected indexes: attendance_main, student_records',
      'Index metadata retrieved'
    ],
    'splunk:report:generate': [
      'Compiling attendance trend report...',
      'Consolidating trend analysis results...',
      'Formatting data for dashboard visualization...',
      'Preparing trend charts and statistics...',
      'Including weekly pattern analysis...',
      'Generating trend summary...',
      'Attendance trend report generation complete'
    ],
    'splunk:search:trend_analysis': [
      'Generating 7-day attendance trend analysis...',
      'Using attendance summary data for trend calculation...',
      'Aggregating daily attendance rates...',
      `${dayjs().subtract(6, 'day').format('MM-DD')}: 96.2% attendance (468/487 present)`,
      `${dayjs().subtract(5, 'day').format('MM-DD')}: 95.8% attendance (467/487 present)`,
      `${dayjs().subtract(4, 'day').format('MM-DD')}: 97.1% attendance (473/487 present)`,
      `${dayjs().subtract(3, 'day').format('MM-DD')}: 94.9% attendance (462/487 present)`,
      `${dayjs().subtract(2, 'day').format('MM-DD')}: 96.5% attendance (470/487 present)`,
      `${dayjs().subtract(1, 'day').format('MM-DD')}: 95.3% attendance (464/487 present)`,
      `${dayjs().format('MM-DD')}: 95.8% attendance (467/487 present)`,
      'Calculating weekly trend: stable attendance pattern',
      'Average weekly attendance: 96.0%',
      'Identifying daily patterns and anomalies...',
      'Trend analysis complete - 7-day pattern established'
    ]
  };

  useEffect(() => {
    if (currentIndex >= apiCalls.length) {
      // 所有调用完成，触发完成回调
      setTimeout(onComplete, 500);
      return;
    }

    const currentCall = { ...apiCalls[currentIndex], status: 'pending' as const };
    setCurrentCalls(prev => [...prev, currentCall]);

    // 模拟API调用延迟
    const isSearchStep = currentCall.endpoint.startsWith('splunk:search:');
    
    let baseDelay, randomDelay;
    if (isSearchStep) {
      // 搜索步骤：1.5-3秒
      baseDelay = 1500;
      randomDelay = Math.random() * 1500;
    } else {
      // 普通步骤：0.3-0.8秒
      baseDelay = 300;
      randomDelay = Math.random() * 500;
    }
    const totalDelay = baseDelay + randomDelay;
    
    const timer = setTimeout(() => {
      setCurrentCalls(prev => 
        prev.map((call, index) => 
          index === prev.length - 1 
            ? { 
                ...call, 
                duration: isSearchStep ? 1500 + Math.random() * 1500 : 200 + Math.random() * 300, 
                status: 'success' as const 
              } 
            : call
        )
      );
      setCurrentIndex(prev => prev + 1);
    }, totalDelay);

    return () => clearTimeout(timer);
  }, [currentIndex, apiCalls, onComplete]);

  return (
    <div style={{
      background: 'transparent',
      maxWidth: '860px',
      padding: '0',
      width: '100%'
    }}>
      <div style={{
        color: '#e9d5ff',
        fontSize: '18px',
        fontWeight: '600',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        Fetching School Attendance Data...
      </div>
      
      <div style={{
        paddingLeft: '40px',
        position: 'relative'
      }}>
        {/* 垂直连接线 */}
        <div style={{
          background: 'linear-gradient(to bottom, rgba(139, 92, 246, 0.3) 0%, rgba(79, 70, 229, 0.2) 100%)',
          bottom: '20px',
          left: '15px',
          position: 'absolute',
          top: '20px',
          width: '2px'
        }} />
        
        {currentCalls.map((call, index) => (
          <div key={index} style={{
            marginBottom: '8px',
            minHeight: '50px',
            position: 'relative'
          }}>
            {/* 流程节点圆点 */}
            <div style={{
              background: call.status === 'success' 
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              border: '2px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '50%',
              boxShadow: call.status === 'success' 
                ? '0 0 8px rgba(16, 185, 129, 0.4)' 
                : '0 0 8px rgba(139, 92, 246, 0.4)',
              height: '12px',
              left: '-32px',
              position: 'absolute',
              width: '12px',
              zIndex: 2
            }} />
            
            {/* 流程内容 */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.06) 0%, rgba(55, 48, 163, 0.06) 100%)',
              border: '1px solid rgba(79, 70, 229, 0.12)',
              borderRadius: '6px',
              flex: 1,
              padding: '12px 16px',
              transition: 'all 0.3s ease'
            }}>
              <div style={{
                alignItems: 'center',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <div style={{
                  alignItems: 'center',
                  display: 'flex',
                  flex: 1,
                  gap: '12px'
                }}>
                  <div style={{
                    color: call.status === 'success' ? '#10b981' : '#8b5cf6',
                    fontSize: '14px'
                  }}>
                    {call.status === 'success' ? '✓' : '○'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      color: '#e9d5ff',
                      fontSize: '13px',
                      fontWeight: '500',
                      marginBottom: '2px'
                    }}>
                      {call.description}
                    </div>
                    <div style={{
                      color: '#a78bfa',
                      fontSize: '11px',
                      opacity: 0.8
                    }}>
                      {call.endpoint}
                    </div>
                  </div>
                </div>
                
                {call.status === 'success' && call.duration && (
                  <div style={{
                    background: 'rgba(139, 92, 246, 0.1)',
                    borderRadius: '4px',
                    color: '#a78bfa',
                    fontSize: '11px',
                    padding: '2px 6px'
                  }}>
                    {call.duration.toFixed(0)}ms
                  </div>
                )}
              </div>
              
              {/* 数据滚动展示区域 */}
              {call.status === 'pending' && mockDataSamples[call.endpoint as keyof typeof mockDataSamples] && (
                <div style={{
                  background: 'rgba(139, 92, 246, 0.08)',
                  borderRadius: '4px',
                  fontSize: '10px',
                  marginTop: '8px',
                  padding: '8px'
                }}>
                  <DataRoller 
                    data={mockDataSamples[call.endpoint as keyof typeof mockDataSamples]} 
                    interval={300}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * 考勤趋势图表组件
 */
interface AttendanceTrendRenderProps {
  openDrawer: (title: string, data: any) => Promise<void>;
  trends: AttendanceTrend[];
}

export const AttendanceTrendRender: React.FC<AttendanceTrendRenderProps> = ({ trends, openDrawer }) => {
  // 趋势图配置
  const trendOption = {
    backgroundColor: 'transparent',
    grid: {
      bottom: '15%',
      left: '10%',
      right: '10%',
      top: '20%'
    },
    series: [
      {
        areaStyle: {
          color: {
            colorStops: [{
              color: 'rgba(139, 92, 246, 0.4)',
              offset: 0
            }, {
              color: 'rgba(79, 70, 229, 0.1)',
              offset: 1
            }],
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
      }
    ],
    title: {
      left: 'center',
      text: '7-Day Attendance Trend',
      textStyle: {
        color: '#e9d5ff',
        fontSize: 14,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      backgroundColor: 'rgba(79, 70, 229, 0.9)',
      borderColor: 'rgba(139, 92, 246, 0.5)',
      textStyle: {
        color: '#e9d5ff'
      },
      trigger: 'axis'
    },
    xAxis: {
      axisLabel: {
        color: '#c4b5fd',
        fontSize: 10
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
        fontSize: 10
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(139, 92, 246, 0.3)'
        }
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(139, 92, 246, 0.2)'
        }
      },
      type: 'value'
    }
  };

  const handleTrendClick = async () => {
    const detailData = trends.reduce((acc, item, index) => {
      // 生成随机数据 - 大差异版本
      const randomEnrolled = Math.floor(Math.random() * 300) + 300; // 300-600 之间，差异300
      const attendanceVariation = Math.random() * 0.4 + 0.6; // 60%-100% 出勤率范围
      const randomPresent = Math.floor(randomEnrolled * attendanceVariation);
      const randomRate = Math.round((randomPresent / randomEnrolled) * 100 * 10) / 10;
      const randomAbsent = randomEnrolled - randomPresent;
      const randomLate = Math.floor(Math.random() * 25) + 5; // 5-30 之间，差异更大
      const randomExcused = Math.floor(Math.random() * Math.min(randomAbsent, 20)); // 0-20 之间，不超过缺勤数
      const randomUnexcused = randomAbsent - randomExcused;
      
      acc[`Data Point ${index + 1}`] = {
        'Absent': randomAbsent,
        'Attendance Rate': `${randomRate}%`,
        'Date': item.date,
        'Excused Absences': randomExcused,
        'Late Arrivals': randomLate,
        'Present': randomPresent,
        'Special Events': Math.random() > 0.7 ? ['School Assembly', 'Field Trip', 'Sports Day', 'Parent Meeting'][Math.floor(Math.random() * 4)] : 'None',
        'Total Enrolled': randomEnrolled,
        'Unexcused Absences': randomUnexcused,
        'Weather': ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy'][Math.floor(Math.random() * 4)]
      };
      return acc;
    }, {} as any);

    await openDrawer('Attendance Trend Details', detailData);
  };

  return (
    <div style={{
      background: 'transparent',
      height: 'auto',
      padding: '0',
      width: '100%'
    }}>
      <div onClick={handleTrendClick} style={{ cursor: 'pointer', height: '360px' }}>
        <ReactECharts option={trendOption} style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  );
};


/**
 * 学校考勤数据概览组件 - 简化版
 * 直接显示 7-Day Attendance Trend 图表
 */
interface AttendanceSummaryRenderProps {
  data: AttendanceDataResponse;
  onRenderComplete?: () => void;
  openDrawer: (title: string, data: any) => Promise<void>;
}

export const AttendanceSummaryRender: React.FC<AttendanceSummaryRenderProps> = ({ data, openDrawer, onRenderComplete }) => {
  const [hasHistoryData, setHasHistoryData] = useState(false);
  const [showApiCalls, setShowApiCalls] = useState(true);
  const [showCharts, setShowCharts] = useState(false);
  const hasTriggeredAI = useRef(false);
  const hasCheckedHistory = useRef(false);
  
  // 数据验证和处理
  const isValidData = data && data.data;
  const summary = isValidData ? data.data : {};
  
  const campus = (summary as any).campus || 'Shanghai Campus';
  const trends = (summary as any).trends || [];

  // 检查聊天记录中是否有历史数据
  useEffect(() => {
    const checkHistoryData = async () => {
      if (hasCheckedHistory.current) return;
      
      hasCheckedHistory.current = true;
      
      try {
        const { lobeChat } = await import('@lobehub/chat-plugin-sdk/client');
        const historyData = await lobeChat.getPluginMessage();
        
        if (historyData && typeof historyData === 'object' && 'data' in historyData) {
          // 直接显示图表，跳过API调用流程
          setHasHistoryData(true);
          setShowApiCalls(false);
          setShowCharts(true);
        } else {
          setHasHistoryData(false);
        }
      } catch {
        setHasHistoryData(false);
      }
    };
    
    checkHistoryData();
  }, [data]);

  // API调用列表 - 简化版，专注于趋势分析
  const [apiCalls] = useState<SplunkApiCall[]>([
    {
      description: 'Connect to Splunk Server',
      endpoint: 'splunk:connect',
      method: 'CONNECT',
      status: 'pending',
      timestamp: Date.now()
    },
    {
      description: 'Validate Authentication Token',
      endpoint: 'splunk:auth:validate',
      method: 'POST',
      status: 'pending',
      timestamp: Date.now()
    },
    {
      description: 'Retrieve Data Source Index List',
      endpoint: 'splunk:indexes:list',
      method: 'GET',
      status: 'pending',
      timestamp: Date.now()
    },
    {
      description: 'Query Attendance Trend Data',
      endpoint: 'splunk:search:trend_analysis',
      method: 'POST',
      status: 'pending',
      timestamp: Date.now()
    },
    {
      description: 'Generate Trend Report',
      endpoint: 'splunk:report:generate',
      method: 'POST',
      status: 'pending',
      timestamp: Date.now()
    }
  ]);

  const handleApiCallComplete = () => {
    setShowApiCalls(false);
    // 延迟显示图表，模拟数据处理时间
    setTimeout(() => {
      setShowCharts(true);
    }, 1000);
  };

  // 触发完成回调
  useEffect(() => {
    if (showCharts && !hasTriggeredAI.current && onRenderComplete && !hasHistoryData) {
      hasTriggeredAI.current = true;
      
      // 延迟触发，让图表渲染完成
      setTimeout(() => {
        onRenderComplete();
      }, 800);
    }
  }, [showCharts, onRenderComplete, hasHistoryData]);

  // 条件渲染必须在所有Hooks之后
  if (!isValidData) {
    return (
      <div style={{
        alignItems: 'center',
        background: 'transparent',
        borderRadius: '8px',
        display: 'flex',
        height: '280px',
        justifyContent: 'center',
        maxWidth: '860px',
        width: '100%'
      }}>
        <div style={{
          color: '#ef4444',
          fontSize: '16px'
        }}>
          Error: No data received
        </div>
      </div>
    );
  }

  if (showApiCalls) {
    return (
      <AttendanceApiCallRender 
        apiCalls={apiCalls} 
        onComplete={handleApiCallComplete} 
      />
    );
  }

  if (!showCharts) {
    return (
      <div style={{
        alignItems: 'center',
        background: 'transparent',
        borderRadius: '8px',
        display: 'flex',
        height: '280px',
        justifyContent: 'center',
        maxWidth: '860px',
        width: '100%'
      }}>
        <div style={{
          color: '#94a3b8',
          fontSize: '16px'
        }}>
          Processing data...
        </div>
      </div>
    );
  }

  if (!trends || trends.length === 0) {
    return (
      <div style={{
        alignItems: 'center',
        background: 'transparent',
        borderRadius: '8px',
        display: 'flex',
        height: '280px',
        justifyContent: 'center',
        maxWidth: '860px',
        width: '100%'
      }}>
        <div style={{
          color: '#94a3b8',
          fontSize: '16px'
        }}>
          No trend data available
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'transparent',
      maxWidth: '860px',
      padding: '0',
      width: '100%'
    }}>
      <div style={{
        color: '#e9d5ff',
        fontSize: '18px',
        fontWeight: '600',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        {campus} – Middle School Attendance – {dayjs().subtract(6, 'day').format('MMM D')} to {dayjs().format('MMM D')}
      </div>

      {/* 只显示趋势图表 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center',
        marginBottom: '20px',
        width: '100%'
      }}>
        <div style={{ maxWidth: '800px', width: '100%' }}>
          <AttendanceTrendRender openDrawer={openDrawer} trends={trends} />
        </div>
      </div>
    </div>
  );
};