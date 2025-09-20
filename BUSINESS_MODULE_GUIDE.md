# 🚀 业务模块开发指南

## 📖 概述

本项目实现了**框架与业务完全分离**的架构，业务开发者只需要在 `src/business/` 目录下开发，无需修改任何框架代码。

## 🎯 核心特性

- ✅ **完全分离**: 业务代码与框架代码完全隔离
- ✅ **自动发现**: 框架自动发现和注册业务模块
- ✅ **环境变量隔离**: 服务端代码不会被前端打包
- ✅ **类型安全**: 完整的 TypeScript 支持
- ✅ **零配置**: 业务开发者无需了解框架内部

## 📁 目录结构

```
src/business/
├── auto-discovery.ts          # 自动发现系统（框架代码）
├── index.ts                   # 业务注册中心（框架代码）
├── meraki/                    # Meraki 业务模块
│   ├── components.tsx         # 前端组件（纯前端代码）
│   ├── server-handlers.ts     # 服务端处理器（包含环境变量）
│   ├── module.config.ts       # 模块配置
│   └── index.ts              # 模块入口
└── example-user-management/   # 用户管理示例模块
    ├── components.tsx         # 前端组件
    ├── server-handlers.ts     # 服务端处理器
    ├── module.config.ts       # 模块配置
    └── index.ts              # 模块入口
```

## 🛠️ 创建新业务模块

### 第一步：创建目录结构

```bash
mkdir src/business/your-module-name
cd src/business/your-module-name
```

### 第二步：创建前端组件 (`components.tsx`)

```typescript
/**
 * 你的业务组件
 * 纯前端代码，不包含任何服务端逻辑或环境变量
 */

import React from 'react';

// ==================== 业务类型定义 ====================

export interface YourData {
  id: string;
  name: string;
  // 添加你的字段
}

export interface YourResponseData {
  items: YourData[];
  total: number;
}

// ==================== 业务组件 ====================

interface YourRenderProps {
  items: YourData[];
  total: number;
  openDrawer: (title: string, data: any) => Promise<void>;
}

export const YourRender: React.FC<YourRenderProps> = ({ items, total, openDrawer }) => {
  const handleItemClick = async (item: YourData) => {
    const detailData = {
      '📋 基本信息': {
        'ID': item.id,
        '名称': item.name,
        // 添加更多字段
      }
    };

    await openDrawer(`📋 详情 - ${item.name}`, detailData);
  };

  return (
    <div style={{
      background: '#0f172a',
      borderRadius: '12px',
      height: '280px',
      maxWidth: '880px',
      padding: '12px',
      width: '100%'
    }}>
      <h3 style={{
        color: '#f1f5f9',
        fontSize: '14px',
        fontWeight: '700',
        margin: '0 0 8px 0',
        textAlign: 'center'
      }}>
        📋 你的模块 ({total})
      </h3>

      {/* 渲染你的数据 */}
      {items.map(item => (
        <div key={item.id} onClick={() => handleItemClick(item)}>
          {item.name}
        </div>
      ))}
    </div>
  );
};
```

### 第三步：创建服务端处理器 (`server-handlers.ts`)

```typescript
/**
 * 你的服务端处理器
 * 包含所有服务端逻辑和环境变量访问
 * 此文件仅在服务端使用，不会被前端打包
 */

import type { YourResponseData, YourData } from './components';

// ==================== 服务端业务服务 ====================

export const YourServerService = {
  async getItems(params: {
    page?: number;
    limit?: number;
  }): Promise<YourResponseData> {
    console.log('[你的服务端] 获取数据，参数:', params);
    
    // 可以安全地访问环境变量
    const apiKey = process.env.YOUR_API_KEY;
    const dbUrl = process.env.DATABASE_URL;
    
    if (!apiKey) {
      throw new Error('❌ 缺少 YOUR_API_KEY 环境变量');
    }
    
    try {
      // 调用外部API或数据库
      const response = await fetch('https://your-api.com/data', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      const data = await response.json();
      
      return {
        items: data.items,
        total: data.total
      };
      
    } catch (error: any) {
      console.error('[你的服务端] API调用失败:', error.message);
      throw error;
    }
  }
};

// ==================== 服务端API处理器 ====================

export async function handleYourAPI(req: Request): Promise<Response> {
  try {
    const params = await req.json().catch(() => ({}));
    
    // 调用服务端业务服务
    const result = await YourServerService.getItems(params);
    
    // 返回标准格式
    return new Response(JSON.stringify({
      data: result,
      timestamp: Date.now(),
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[你的服务端] API处理错误:', error);
    return new Response(JSON.stringify({
      data: null,
      error: error?.message || '获取数据失败',
      timestamp: Date.now()
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
}
```

### 第四步：创建模块配置 (`module.config.ts`)

```typescript
/**
 * 你的业务模块配置
 * 包含完整的模块配置信息，实现与框架完全分离
 */

import type { BusinessModuleConfig } from '@/framework';
import { registerBusinessModuleLoader } from '../auto-discovery';

// 导入前端组件和类型（安全的前端代码）
import { YourRender, type YourResponseData } from './components';

// 导入服务端处理器（仅在服务端使用）
import { handleYourAPI } from './server-handlers';

import React from 'react';

/**
 * 你的业务模块配置
 */
const yourModuleConfig: BusinessModuleConfig = {
  moduleId: 'your-module-name',
  
  // API名称到端点的映射
  apiMappings: {
    'getYourData': '/your-module/data',
    'updateYourData': '/your-module/update'
  },
  
  // 服务端专用处理器
  serverHandlers: {
    '/your-module/data': handleYourAPI,
    // 可以添加更多处理器
  },
  
  // 插件配置
  plugins: [
    {
      name: "Your Module",
      description: "你的模块描述",
      endpoint: "/your-module/data",
      apiHandler: handleYourAPI,
      render: ({ data, openDrawer }: { data: YourResponseData; openDrawer: (title: string, data: any) => Promise<void> }) => {
        return React.createElement(YourRender, { items: data.items, total: data.total, openDrawer });
      },
      validator: (data: unknown): data is YourResponseData => {
        return Boolean(data && typeof data === 'object' && 
               'data' in data && 
               data.data && 
               typeof data.data === 'object' && 
               'items' in data.data && 
               Array.isArray((data.data as any).items) &&
               'total' in data.data &&
               typeof (data.data as any).total === 'number');
      }
    }
  ]
};

// 自动注册模块加载器
registerBusinessModuleLoader('your-module-name', async () => yourModuleConfig);

export default yourModuleConfig;
```

### 第五步：创建模块入口 (`index.ts`)

```typescript
/**
 * 你的业务模块入口
 * 导出所有必要的类型和组件，自动注册模块
 */

// 导入模块配置（这会自动触发注册）
import './module.config';

// 导出前端组件和类型
export * from './components';

// 导出模块配置（用于测试和调试）
export { default as yourModuleConfig } from './module.config';
```

### 第六步：注册模块

在 `src/business/index.ts` 中添加导入：

```typescript
// 导入所有业务模块（触发自动注册）
import './meraki';
import './your-module-name';  // 添加这行
```

### 第七步：更新 manifest.json

在 `public/manifest.json` 中添加你的API定义：

```json
{
  "api": [
    {
      "url": "http://localhost:3402/api/your-module/data",
      "name": "getYourData",
      "description": "获取你的数据",
      "parameters": {
        "properties": {
          "page": {
            "description": "页码",
            "type": "integer"
          },
          "limit": {
            "description": "每页数量",
            "type": "integer"
          }
        },
        "required": [],
        "type": "object"
      }
    }
  ]
}
```

## 🔧 环境变量配置

### 服务端环境变量
在 `.env.local` 中配置：

```bash
# 你的API密钥（仅服务端可见）
YOUR_API_KEY=your-secret-key
DATABASE_URL=your-database-url

# Meraki API配置
MERAKI_API_KEY=your-meraki-key
MERAKI_ORGANIZATION_ID=your-org-id
```

### 权限配置
配置API级别的用户权限：

```bash
# 允许特定用户访问你的API
NEXT_PUBLIC_API_PERMISSION_GETYOURDATA=admin,user1,user2

# 或者允许所有用户
NEXT_PUBLIC_API_PERMISSION_GETYOURDATA=

# 或者拒绝所有用户
NEXT_PUBLIC_API_PERMISSION_GETYOURDATA=DENY
```

## 🚀 启动开发

```bash
# 安装依赖
bun install

# 启动开发服务器
bun run dev

# 类型检查
bun run type-check

# 代码检查
bun run lint
```

## 📝 最佳实践

1. **分离关注点**: 前端组件只处理UI，服务端处理器只处理业务逻辑
2. **类型安全**: 定义完整的TypeScript类型
3. **错误处理**: 在服务端处理器中添加完整的错误处理
4. **环境变量**: 只在服务端处理器中访问环境变量
5. **模块化**: 每个业务模块都是独立的，可以单独开发和测试

## 🔍 调试技巧

1. **查看注册日志**: 启动时会显示所有注册的模块和API映射
2. **检查权限配置**: 查看控制台的权限检查日志
3. **验证数据格式**: 确保validator函数正确验证数据格式
4. **测试API**: 可以直接访问 `/api/your-endpoint` 测试API

## 📚 示例参考

- **Meraki模块**: `src/business/meraki/` - 完整的网络管理模块
- **用户管理示例**: `src/business/example-user-management/` - 简单的用户管理示例

通过这种架构，你可以专注于业务逻辑开发，而无需关心框架的复杂性！
