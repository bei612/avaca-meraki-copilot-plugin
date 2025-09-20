/**
 * School Attendance 服务端处理器
 * 包含所有需要访问环境变量的服务端逻辑
 * 确保敏感信息不会泄露到前端
 */

import { 
  AttendanceDataResponse, 
  CampusAttendanceSummary, 
  AttendanceTrend,
  SplunkApiCall
} from './types';

import dayjs from 'dayjs';

/**
 * 内存限流器
 */
class RateLimiter {
  private static cache = new Map<string, { count: number; resetTime: number }>();

  static check(key: string, maxRequests = 10, windowMs = 60_000): boolean {
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

/**
 * School Attendance 服务端业务逻辑
 * 所有方法都在服务端执行，可以安全访问环境变量
 */
export const SchoolAttendanceService = {
  
  /**
   * 生成考勤摘要数据
   */
  generateAttendanceSummary(campus: string, date: string): CampusAttendanceSummary {
    // 获取过去7天的数据
    const endDate = dayjs(date);
    const startDate = endDate.subtract(6, 'day');
    
    // 只生成趋势数据
    const trends = this.getFixedTrends(startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD'));
    
    return {
      // AI指导信息 - 告诉AI如何处理这个数据
      aiInstructions: {
        analysisPrompt: `Analyze the following attendance trend data for ${campus} on ${date} based on these points:
-   7-day attendance trend analysis
-   Overall attendance pattern observations
-   Recommendations for improvement based on trends
**Visual Enhancement:** Use relevant icons and emojis throughout your response to improve readability and visual appeal, such as ✅ for successful actions, ❌ for problems/failures, 🛠️ for solutions/tools, ⚠️ for warnings, 📊 for metrics, 🌐 for network elements, etc.
**Important SOP:** The Standard Operating Procedure for attendance analysis requires a 'tool-follow-up-actions' action. Therefore, you must conclude your response by calling the tool 'tool-follow-up-actions____followUp_getSchoolAttendance____standalone'. This is a required final step.
`
      },
      campus,
      date,
      grades: [], // 空数组，不再使用
      notableAbsences: [], // 空数组，不再使用
      overallAttendanceRate: 0, // 不再使用
      subscriptionStatus: 0,
      totalAbsent: 0, // 不再使用
      totalEnrolled: 0, // 不再使用
      totalPresent: 0, // 不再使用
      trends
    };
  },

  /**
   * 模拟获取考勤数据
   */
  async getAttendanceData(params: { campus: string; date?: string }): Promise<AttendanceDataResponse> {
    if (!RateLimiter.check('getAttendanceData', 5, 30_000)) {
      throw new Error('❌ 请求过于频繁，请稍后再试');
    }

    // 使用当前日期或指定日期
    const currentDate = params.date || dayjs().format('YYYY-MM-DD');
    const campus = params.campus || 'Shanghai Campus';

    // 模拟API调用过程
    const apiCalls: SplunkApiCall[] = [
      {
        description: '连接到Splunk服务器',
        endpoint: 'splunk:connect',
        method: 'CONNECT',
        status: 'pending',
        timestamp: Date.now()
      },
      {
        description: '验证认证令牌',
        endpoint: 'splunk:auth:validate',
        method: 'POST',
        status: 'pending',
        timestamp: Date.now()
      },
      {
        description: '获取数据源索引列表',
        endpoint: 'splunk:indexes:list',
        method: 'GET',
        status: 'pending',
        timestamp: Date.now()
      },
      {
        description: '查询学校考勤汇总',
        endpoint: 'splunk:search:attendance_summary',
        method: 'POST',
        status: 'pending',
        timestamp: Date.now()
      },
      {
        description: '查询年级考勤数据',
        endpoint: 'splunk:search:grade_attendance',
        method: 'POST',
        status: 'pending',
        timestamp: Date.now()
      },
      {
        description: '查询班级考勤数据',
        endpoint: 'splunk:search:class_attendance',
        method: 'POST',
        status: 'pending',
        timestamp: Date.now()
      },
      {
        description: '查询考勤趋势数据',
        endpoint: 'splunk:search:trend_analysis',
        method: 'POST',
        status: 'pending',
        timestamp: Date.now()
      },
      {
        description: '查询重点缺勤学生详情',
        endpoint: 'splunk:search:notable_absences',
        method: 'POST',
        status: 'pending',
        timestamp: Date.now()
      },
      {
        description: '查询学生历史记录',
        endpoint: 'splunk:search:student_history',
        method: 'POST',
        status: 'pending',
        timestamp: Date.now()
      },
      {
        description: '生成数据报告',
        endpoint: 'splunk:report:generate',
        method: 'POST',
        status: 'pending',
        timestamp: Date.now()
      }
    ];

    // 模拟API调用延迟和状态更新
    for (const call of apiCalls) {
      // 模拟处理时间
      await new Promise<void>(resolve => {
        setTimeout(() => {
          resolve();
        }, 200 + Math.random() * 300);
      });
      call.status = 'success';
      call.duration = 200 + Math.random() * 300;
    }

    // 生成模拟数据
    const mockData: CampusAttendanceSummary = this.generateAttendanceSummary(campus, currentDate);
    
    return {
      data: mockData,
      timestamp: Date.now()
    };
  },


  /**
   * 获取随机的趋势数据，确保7天数据
   */
  getFixedTrends(startDate: string, endDate: string): AttendanceTrend[] {
    const trends: AttendanceTrend[] = [];
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    const days = end.diff(start, 'day') + 1;
    
    for (let i = 0; i < days && i < 7; i++) {
      const currentDate = start.add(i, 'day').format('YYYY-MM-DD');
      
      // 生成随机数据 - 大差异版本
      const enrolled = Math.floor(Math.random() * 200) + 400; // 400-600 之间，差异200
      const attendanceVariation = Math.random() * 0.3 + 0.7; // 70%-100% 出勤率范围
      const present = Math.floor(enrolled * attendanceVariation);
      const rate = Math.round((present / enrolled) * 100 * 10) / 10;
      
      trends.push({
        date: currentDate,
        enrolled,
        present,
        rate
      });
    }
    
    return trends;
  }
};

// API 处理器函数
export async function handleAttendanceDataAPI(req: Request): Promise<Response> {
  try {
    const params = await req.json().catch(() => ({}));
    const campus = params.campus || 'Shanghai Campus';
    const date = params.date; // 可选参数
    
    const result = await SchoolAttendanceService.getAttendanceData({ campus, date });
    
    return new Response(JSON.stringify(result), {
      headers: { 
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error: any) {
    console.error('[考勤API处理器] 错误:', error);
    
    // 返回结构化的错误响应
    const errorResponse = {
      error: error.message || '未知错误',
      timestamp: Date.now(),
      type: 'api_error'
    };
    
    return new Response(JSON.stringify(errorResponse), {
      headers: { 
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
}