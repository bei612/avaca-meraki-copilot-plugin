# LobeChat 插件信号使用指南

## 📋 14种标准信号的正确使用

### 1. 插件生命周期信号

#### 1.1 `lobe-chat:plugin-ready-for-render`
**用途**: 插件向 LobeChat 发送就绪信号
**时机**: 插件加载完成后立即发送
**方向**: 插件 → LobeChat

```typescript
// 正确用法
useEffect(() => {
  window.parent.postMessage({
    type: 'lobe-chat:plugin-ready-for-render'
  }, '*');
}, []);
```

#### 1.2 `lobe-chat:init-standalone-plugin`
**用途**: LobeChat 向插件发送初始化数据
**时机**: 收到插件就绪信号后
**方向**: LobeChat → 插件

```typescript
// 正确用法
useEffect(() => {
  const handleMessage = (event: MessageEvent) => {
    if (event.data?.type === 'lobe-chat:init-standalone-plugin') {
      setPluginData(event.data);
    }
  };
  window.addEventListener('message', handleMessage);
  return () => window.removeEventListener('message', handleMessage);
}, []);
```

### 2. 数据通信信号

#### 2.1 `lobe-chat:fetch-plugin-message`
**用途**: 获取插件历史消息数据
**SDK方法**: `lobeChat.getPluginMessage()`

```typescript
// 正确用法
const checkHistoryData = async () => {
  try {
    const historyData = await lobeChat.getPluginMessage();
    if (historyData && typeof historyData === 'object' && 'data' in historyData) {
      return historyData.data;
    }
    return null;
  } catch (error) {
    console.error('获取历史数据失败:', error);
    return null;
  }
};
```

#### 2.2 `lobe-chat:fill-plugin-content`
**用途**: 向 LobeChat 发送插件执行结果
**SDK方法**: `lobeChat.setPluginMessage(content, triggerAiMessage)`

```typescript
// 正确用法
const savePluginData = async (data: any) => {
  try {
    // 第二个参数控制是否触发AI消息
    await lobeChat.setPluginMessage({ data }, true);
    console.log('数据保存成功，AI将生成分析');
  } catch (error) {
    console.error('保存数据失败:', error);
  }
};
```

### 3. 状态管理信号

#### 3.1 `lobe-chat:fetch-plugin-state`
**用途**: 获取插件状态
**SDK方法**: `lobeChat.getPluginState(key)`

```typescript
// 正确用法
const loadPluginState = async () => {
  try {
    const viewCount = await lobeChat.getPluginState<number>('viewCount');
    const userPreferences = await lobeChat.getPluginState<object>('userPreferences');
    return { viewCount: viewCount || 0, userPreferences: userPreferences || {} };
  } catch (error) {
    console.error('获取状态失败:', error);
    return { viewCount: 0, userPreferences: {} };
  }
};
```

#### 3.2 `lobe-chat:update-plugin-state`
**用途**: 更新插件状态
**SDK方法**: `lobeChat.setPluginState(key, value)`

```typescript
// 正确用法
const updatePluginState = async () => {
  try {
    await lobeChat.setPluginState('viewCount', viewCount + 1);
    await lobeChat.setPluginState('lastAccess', Date.now());
    console.log('状态更新成功');
  } catch (error) {
    console.error('状态更新失败:', error);
  }
};
```

### 4. 设置管理信号

#### 4.1 `lobe-chat:fetch-plugin-settings`
**用途**: 获取插件设置
**SDK方法**: `lobeChat.getPluginSettings()`

```typescript
// 正确用法
const loadSettings = async () => {
  try {
    const settings = await lobeChat.getPluginSettings<PluginSettings>();
    return settings || { autoRefresh: false, theme: 'dark' };
  } catch (error) {
    console.error('获取设置失败:', error);
    return { autoRefresh: false, theme: 'dark' };
  }
};
```

#### 4.2 `lobe-chat:update-plugin-settings`
**用途**: 更新插件设置
**SDK方法**: `lobeChat.setPluginSettings(settings)`

```typescript
// 正确用法
const updateSettings = async (newSettings: Partial<PluginSettings>) => {
  try {
    const updatedSettings = { ...currentSettings, ...newSettings };
    await lobeChat.setPluginSettings(updatedSettings);
    setCurrentSettings(updatedSettings);
    console.log('设置更新成功');
  } catch (error) {
    console.error('设置更新失败:', error);
  }
};
```

### 5. AI交互信号

#### 5.1 `lobe-chat:trigger-ai-message`
**用途**: 手动触发AI消息生成
**SDK方法**: `lobeChat.triggerAIMessage(messageId)`

```typescript
// 正确用法
const triggerAIAnalysis = async () => {
  try {
    // 需要提供消息ID
    await lobeChat.triggerAIMessage(currentMessageId);
    console.log('AI分析已触发');
  } catch (error) {
    console.error('触发AI分析失败:', error);
  }
};
```

#### 5.2 `lobe-chat:create-assistant-message`
**用途**: 创建助手消息
**SDK方法**: `lobeChat.createAssistantMessage(content)`

```typescript
// 正确用法
const createAnalysisMessage = async () => {
  try {
    const analysisPrompt = `请分析以下数据：${JSON.stringify(data)}`;
    await lobeChat.createAssistantMessage(analysisPrompt);
    console.log('助手消息已创建');
  } catch (error) {
    console.error('创建助手消息失败:', error);
  }
};
```

### 6. 渲染控制信号

#### 6.1 `lobe-chat:render-plugin`
**用途**: LobeChat 控制插件渲染
**方向**: LobeChat → 插件
**说明**: 通常由 LobeChat 自动处理

#### 6.2 `lobe-chat:render-plugin-settings`
**用途**: 渲染插件设置界面
**方向**: LobeChat → 插件
**说明**: 用于插件设置页面

#### 6.3 `lobe-chat:render-plugin-state`
**用途**: 渲染插件状态
**方向**: LobeChat → 插件
**说明**: 用于调试和状态显示

### 7. UI交互信号

#### 7.1 `openToolUI`
**用途**: 打开插件抽屉界面
**方向**: 插件 → LobeChat

```typescript
// 正确用法
const openDrawer = async () => {
  try {
    // 先保存抽屉数据
    await lobeChat.setPluginState('drawerData', {
      title: '详细信息',
      content: htmlContent,
      timestamp: Date.now()
    });
    
    // 然后发送打开信号
    window.parent.postMessage({ type: 'openToolUI' }, '*');
  } catch (error) {
    console.error('打开抽屉失败:', error);
  }
};
```

## 🔧 完整的插件初始化流程

```typescript
const initializePlugin = async () => {
  try {
    // 1. 发送就绪信号
    window.parent.postMessage({
      type: 'lobe-chat:plugin-ready-for-render'
    }, '*');
    
    // 2. 监听初始化数据
    window.addEventListener('message', handleInitMessage);
    
    // 3. 获取插件设置
    const settings = await lobeChat.getPluginSettings();
    
    // 4. 获取插件状态
    const state = await lobeChat.getPluginState('appState');
    
    // 5. 检查历史数据
    const historyData = await lobeChat.getPluginMessage();
    
    // 6. 根据情况加载数据或显示历史
    if (historyData) {
      displayHistoryData(historyData);
    } else {
      await loadNewData();
    }
    
  } catch (error) {
    console.error('插件初始化失败:', error);
  }
};
```

## ❌ 常见错误

### 1. 数据结构错误
```typescript
// ❌ 错误：直接使用初始化数据的字段名
const args = pluginData.payload.apiName; // apiName 不存在

// ✅ 正确：使用 SDK 方法获取
const payload = await lobeChat.getPluginPayload();
const apiName = payload.name; // 正确的字段名是 name
```

### 2. 历史数据检测不准确
```typescript
// ❌ 错误：简单的存在性检查
if (historyData && 'data' in historyData) {
  // 可能误判
}

// ✅ 正确：严格的数据结构验证
if (historyData && 
    typeof historyData === 'object' && 
    'data' in historyData &&
    historyData.data &&
    typeof historyData.data === 'object' &&
    'trends' in historyData.data &&
    Array.isArray(historyData.data.trends)) {
  // 确保数据结构正确
}
```

### 3. 错误处理不完整
```typescript
// ❌ 错误：忽略错误
const data = await lobeChat.getPluginMessage();

// ✅ 正确：完整的错误处理
try {
  const data = await lobeChat.getPluginMessage();
  return data;
} catch (error) {
  console.error('获取数据失败:', error);
  return null;
}
```

## 📊 信号使用统计

| 信号类型 | 使用频率 | 重要性 | 说明 |
|---------|---------|--------|------|
| `plugin-ready-for-render` | 必须 | 高 | 插件生命周期必需 |
| `init-standalone-plugin` | 必须 | 高 | 接收初始化数据 |
| `fetch-plugin-message` | 推荐 | 高 | 历史数据检测 |
| `fill-plugin-content` | 必须 | 高 | 保存执行结果 |
| `fetch-plugin-state` | 推荐 | 中 | 状态管理 |
| `update-plugin-state` | 推荐 | 中 | 状态更新 |
| `fetch-plugin-settings` | 可选 | 中 | 设置管理 |
| `update-plugin-settings` | 可选 | 中 | 设置更新 |
| `trigger-ai-message` | 可选 | 低 | 手动触发AI |
| `create-assistant-message` | 可选 | 低 | 创建助手消息 |
| `openToolUI` | 推荐 | 中 | 抽屉交互 |

## 🎯 最佳实践

1. **始终使用 SDK 方法**：优先使用 `lobeChat.*` 方法而不是直接 postMessage
2. **完整的错误处理**：所有异步操作都要有 try-catch
3. **数据结构验证**：严格验证历史数据的结构
4. **状态管理**：合理使用插件状态存储用户偏好
5. **性能优化**：避免不必要的重复调用
6. **调试友好**：添加详细的日志输出

这个重构版本展示了如何正确使用所有14种信号，确保插件与 LobeChat 的完美集成。
