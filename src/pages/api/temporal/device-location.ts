/**
 * Temporal Workflow API - 设备点位图工作流
 * 调用 DeviceLocationWorkflow 获取设备点位图（散点图）
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Connection, Client } from '@temporalio/client';

interface DeviceLocationRequest {
  org_id?: string;
  search_keyword?: string;
}

interface DeviceLocationResponse {
  data?: any;
  error?: string;
  success: boolean;
  timestamp: number;
}

// 内存限流器
class RateLimiter {
  private static cache = new Map<string, { count: number; resetTime: number }>();

  static check(key: string, maxRequests = 5, windowMs = 30_000): boolean {
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DeviceLocationResponse>
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
    const params: DeviceLocationRequest = req.body || {};
    const org_id = params.org_id || "850617379619606726";
    const search_keyword = params.search_keyword || "Corr";

    console.log('[temporal-api] 调用设备点位图工作流:', { org_id, search_keyword });

    // 连接 Temporal
    const connection = await Connection.connect({ 
      address: 'temporal:7233' 
    });
    
    const client = new Client({ 
      connection, 
      namespace: 'avaca' 
    });

    // 启动工作流
    const handle = await client.workflow.start('DeviceLocationWorkflow', {
      args: [{ org_id, search_keyword }],
      taskQueue: 'meraki-workflows-queue',
      workflowId: `device-location-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    });

    console.log('[temporal-api] 工作流已启动，ID:', handle.workflowId);

    // 等待工作流完成
    const result = await handle.result();

    console.log('[temporal-api] 工作流执行完成:', {
      hasEchartsData: !!result.echarts_data,
      success: result.success
    });

    // 设置响应头
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    return res.status(200).json({
      data: result,
      success: true,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('[temporal-api] 设备点位图工作流执行失败:', error);

    return res.status(500).json({
      error: error instanceof Error ? error.message : '服务器内部错误',
      success: false,
      timestamp: Date.now()
    });
  }
}
