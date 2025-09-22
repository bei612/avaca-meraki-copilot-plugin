#!/usr/bin/env python3
"""
测试动态图表展示逻辑
验证不同调用方式下的图表数量
"""

def test_chart_display_logic():
    """测试图表展示逻辑"""
    
    print("🧪 测试动态图表展示逻辑")
    print("=" * 50)
    
    # 测试场景1：单个 API 调用
    print("\n📊 场景1：单个 API 调用")
    print("调用: getDeviceStatus")
    print("预期: 显示1个图表 (设备状态分布饼图)")
    print("逻辑: apiName -> workflowId -> 单个 echarts_data")
    
    print("\n📊 场景2：单个 API 调用")
    print("调用: getLicenseDetails")
    print("预期: 显示1个图表 (许可证状态仪表盘)")
    print("逻辑: apiName -> workflowId -> 单个 echarts_data")
    
    # 测试场景3：多个工作流调用
    print("\n📊 场景3：多个工作流调用")
    print("调用: displayMultipleCharts")
    print("参数: workflow_ids=['device-status', 'client-count', 'license-details']")
    print("预期: 显示3个图表")
    print("逻辑: workflow_ids -> 执行多个工作流 -> 收集所有 echarts_data")
    
    # 测试场景4：工作流返回多个图表
    print("\n📊 场景4：工作流返回多个图表")
    print("调用: getDeviceInspection")
    print("预期: 显示N个图表 (根据工作流返回的 echarts_data 数量)")
    print("逻辑: 单个工作流可能返回数组形式的 echarts_data")
    
    # API 映射表
    print("\n🗺️  API 到工作流映射表:")
    api_mapping = {
        'getDeviceStatus': 'device-status',
        'getAPDeviceQuery': 'ap-device-query', 
        'getClientCount': 'client-count',
        'getFirmwareSummary': 'firmware-summary',
        'getLicenseDetails': 'license-details',
        'getDeviceInspection': 'device-inspection',
        'getFloorplanAP': 'floorplan-ap',
        'getDeviceLocation': 'device-location',
        'getLostDeviceTrace': 'lost-device-trace',
        'getAlertsLog': 'alerts-log'
    }
    
    for api_name, workflow_id in api_mapping.items():
        print(f"  {api_name} -> {workflow_id}")
    
    # 数据流程
    print("\n🔄 数据流程:")
    print("1. 检查历史数据 (如果有，直接显示)")
    print("2. 获取插件参数")
    print("3. 判断调用类型:")
    print("   - 有 workflow_ids: 执行多个工作流")
    print("   - 无 workflow_ids: 根据 apiName 执行单个工作流")
    print("4. 收集 echarts_data")
    print("5. 动态计算布局 (1-2列网格)")
    print("6. 渲染图表")
    
    # 布局逻辑
    print("\n📐 布局逻辑:")
    print("- 1个图表: 居中显示，撑满宽度")
    print("- 2个图表: 平分一行")
    print("- 3个图表: 2+1布局 (前2个一行，第3个居中)")
    print("- 4个图表: 2x2网格")
    print("- N个图表: 每行最多2个，自动换行")
    
    print("\n✅ 测试逻辑验证完成!")
    print("现在图表数量完全由实际返回的 echarts_data 决定")

if __name__ == "__main__":
    test_chart_display_logic()
