/**
 * School Attendance 业务模块 - 类型定义
 */

// 基础数据类型
export interface AttendanceRecord {
  absent: number; 
  attendanceRate: number;
  date: string;
  // YYYY-MM-DD
  enrolled: number;
  excused: number;
  late: number;
  present: number;
  unexcused: number; // 0-100
}

export interface GradeAttendance {
  absent: number;
  attendanceRate: number;
  enrolled: number;
  excused: number;
  grade: string;
  late: number;
  present: number;
  unexcused: number; // 0-100
}

export interface StudentAbsence {
  daysAbsent: number;
  grade: string;
  id: string;
  lastAttendanceDate: string;
  name: string; 
  notes?: string;
  // YYYY-MM-DD
  reason?: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface AttendanceTrend {
  date: string; 
  // 0-100
  enrolled: number; 
  present: number;
  // YYYY-MM-DD
  rate: number;
}

export interface CampusAttendanceSummary {
  // -1: declined, 0: not set, 1: subscribed
// AI指导信息 - 告诉AI如何处理这个数据
  aiInstructions?: {
    analysisPrompt: string;
    nextActions?: string[];
    responseFormat?: string;
  };
  campus: string; 
  date: string;
  // 0-100
  grades: GradeAttendance[];
  notableAbsences: StudentAbsence[];
  overallAttendanceRate: number; 
  subscriptionStatus?: number;
  totalAbsent: number;
  // YYYY-MM-DD
  totalEnrolled: number;
  totalPresent: number; 
  trends: AttendanceTrend[];
}



// API响应类型
export interface AttendanceDataResponse {
  data: CampusAttendanceSummary;
  timestamp: number;
}

// Splunk API 日志类型
export interface SplunkApiCall {
  description: string;
  duration?: number;
  endpoint: string;
  method: string; 
  status: 'pending' | 'success' | 'error';
  // milliseconds
  timestamp: number;
}


