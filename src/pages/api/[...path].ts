/**
 * 智能API路由
 * 自动调用框架注册的业务模块
 */

import { getFramework } from '@/framework';
import type { NextApiRequest, NextApiResponse } from 'next';

// export const config = { runtime: 'edge' };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 确保业务模块已注册
    const { registerAllBusinessPlugins } = await import('@/business');
    await registerAllBusinessPlugins();

    // 安全地获取路径参数
    const pathArray = req.query.path as string[] || [];
    const path = '/' + pathArray.join('/');

    // 获取框架实例
    const framework = getFramework();
    
    // 优先使用服务端专用处理器
    const businessModules = Array.from((framework as any).businessModules.values());
    let serverHandler: ((req: Request) => Promise<Response>) | undefined;
    
    for (const module of businessModules) {
      const typedModule = module as any;
      if (typedModule.serverHandlers && typedModule.serverHandlers[path]) {
        serverHandler = typedModule.serverHandlers[path];
        break;
      }
    }

    // 创建 Request 对象以兼容框架
    const request = new Request(`http://localhost:3402/api${path}`, {
      body: JSON.stringify(req.body),
      headers: {
        'content-type': 'application/json',
        ...req.headers as Record<string, string>
      },
      method: req.method || 'POST'
    });

    let response: Response;
    
    if (serverHandler) {
      // 使用服务端专用处理器
      response = await serverHandler(request);
    } else {
      // 回退到框架的智能路由
      response = await framework.handleApiRequest(path, request);
    }
    
    // 转换 Response 到 NextApiResponse
    const data = await response.json();
    return res.status(response.status).json(data);
    
  } catch (error) {
    console.error('[API] 路由处理错误:', error);
    return res.status(500).json({ 
      error: '服务器内部错误',
      message: error instanceof Error ? error.message : '未知错误'
    });
  }
}
