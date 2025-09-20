/**
 * 共享类型定义
 * 业务插件可以扩展这些基础类型
 */

export interface BaseResponseData<T = any> {
  data: T;
  error?: string;
  timestamp: number;
}

export interface PluginManifest {
  api: ApiDefinition[];
  author: string;
  createdAt: string;
  identifier: string;
  meta: {
    avatar: string;
    description: string;
    tags: string[];
    title: string;
  };
  type: string;
  ui: {
    height: number;
    url: string;
    width: number;
  };
  version: string;
}

export interface ApiDefinition {
  description: string;
  name: string;
  parameters: {
    properties: Record<string, any>;
    required?: string[];
    type: string;
  };
  url: string;
}

export interface UserContext {
  [key: string]: any;
  nickname?: string;
  userId: string;
}