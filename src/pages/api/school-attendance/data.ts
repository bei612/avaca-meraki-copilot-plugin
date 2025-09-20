import type { NextApiRequest, NextApiResponse } from 'next';
import { handleAttendanceDataAPI } from '@/business/school-attendance/server-handlers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 创建 Request 对象
    const request = new Request('http://localhost/api/school-attendance/data', {
      body: JSON.stringify(req.body || {}),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST'
    });

    // 调用业务处理器
    const response = await handleAttendanceDataAPI(request);
    const data = await response.json();
    
    return res.status(response.status).json(data);
  } catch (error: any) {
    return res.status(500).json({ 
      error: error.message || '服务器内部错误'
    });
  }
}
