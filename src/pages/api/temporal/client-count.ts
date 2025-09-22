/**
 * Temporal Workflow API - 客户端数量统计工作流
 * 调用 ClientCountWorkflow 获取客户端数量统计（柱状图）
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Connection, Client } from '@temporalio/client';

interface ClientCountRequest {
  org_id?: string;
}

interface ClientCountResponse {
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
  res: NextApiResponse<ClientCountResponse>
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
    const params: ClientCountRequest = req.body || {};
    const org_id = params.org_id || "850617379619606726";

    console.log('[temporal-api] 调用客户端数量统计工作流:', { org_id });

    // 连接 Temporal
    const connection = await Connection.connect({ 
      address: 'temporal:7233' 
    });
    
    const client = new Client({ 
      connection, 
      namespace: 'avaca' 
    });

    // 启动工作流
    const handle = await client.workflow.start('ClientCountWorkflow', {
      args: [{ org_id }],
      taskQueue: 'meraki-workflows-queue',
      workflowId: `client-count-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
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
    console.error('[temporal-api] 客户端数量统计工作流执行失败:', error);

    return res.status(500).json({
      error: error instanceof Error ? error.message : '服务器内部错误',
      success: false,
      timestamp: Date.now()
    });
  }
}
