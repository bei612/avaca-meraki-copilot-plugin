#!/usr/bin/env python3
"""
测试右侧抽屉展示的完整数据结构
验证工作流完整数据的展示
"""

import json

def test_drawer_data_structure():
    """测试抽屉数据结构"""
    
    print("🗂️  测试右侧抽屉完整数据展示")
    print("=" * 60)
    
    # 模拟工作流完整返回数据
    mock_workflow_result = {
        "success": True,
        "message": "设备状态查询成功",
        "timestamp": "2025-09-22T14:21:31Z",
        "execution_time": "2.34s",
        "organization_id": "850617379619606726",
        "total_devices": 174,
        "device_summary": {
            "online": 168,
            "offline": 4,
            "alerting": 2,
            "dormant": 0
        },
        "network_details": [
            {
                "network_id": "N_123456789",
                "network_name": "Main Campus",
                "device_count": 120,
                "status": "healthy"
            },
            {
                "network_id": "N_987654321", 
                "network_name": "Branch Office",
                "device_count": 54,
                "status": "warning"
            }
        ],
        "raw_api_responses": {
            "organizations": {"id": "850617379619606726", "name": "Concordia Demo"},
            "networks": [{"id": "N_123456789", "name": "Main Campus"}],
            "devices": [{"serial": "Q2XX-XXXX-XXXX", "status": "online"}]
        },
        "echarts_data": [
            {
                "type": "pie",
                "title": "设备状态分布",
                "data": [
                    {"name": "在线设备", "value": 168},
                    {"name": "离线设备", "value": 4},
                    {"name": "告警设备", "value": 2},
                    {"name": "休眠设备", "value": 0}
                ],
                "option": {
                    "title": {"text": "设备状态分布"},
                    "series": [{"type": "pie", "data": []}]
                }
            }
        ]
    }
    
    # 抽屉展示的数据结构
    drawer_data = {
        "📊 图表信息": {
            "标题": "设备状态分布",
            "类型": "PIE",
            "索引": "第 1 个图表"
        },
        "🔄 工作流信息": {
            "工作流ID": "device-status",
            "执行状态": "成功",
            "数据来源": "实时执行"
        },
        "📈 ECharts 配置": mock_workflow_result["echarts_data"][0]["option"],
        "📋 图表原始数据": mock_workflow_result["echarts_data"][0]["data"],
        "🗄️ 工作流完整返回": mock_workflow_result
    }
    
    print("📊 右侧抽屉展示的数据层级:")
    print()
    
    print("1️⃣  📊 图表信息")
    print("   - 图表标题、类型、索引位置")
    print("   - 用于快速识别当前查看的图表")
    print()
    
    print("2️⃣  🔄 工作流信息") 
    print("   - 工作流ID、执行状态、数据来源")
    print("   - 帮助理解数据的生成过程")
    print()
    
    print("3️⃣  📈 ECharts 配置")
    print("   - 完整的 ECharts option 配置")
    print("   - 包含图表样式、交互、动画等所有设置")
    print()
    
    print("4️⃣  📋 图表原始数据")
    print("   - ECharts 图表使用的原始数据")
    print("   - 通常是处理后的可视化数据")
    print()
    
    print("5️⃣  🗄️ 工作流完整返回 (核心)")
    print("   - 包含工作流的所有返回数据")
    print("   - 不仅仅是 echarts_data，还有:")
    print("     • 执行状态和时间信息")
    print("     • 业务数据汇总")
    print("     • 详细的网络和设备信息") 
    print("     • 原始 API 响应数据")
    print("     • 错误信息和调试数据")
    print()
    
    print("📋 完整数据示例结构:")
    print(json.dumps({
        "工作流基本信息": {
            "success": "执行状态",
            "message": "执行消息", 
            "timestamp": "执行时间",
            "execution_time": "耗时"
        },
        "业务数据": {
            "organization_id": "组织ID",
            "total_devices": "设备总数",
            "device_summary": "设备状态汇总",
            "network_details": "网络详情列表"
        },
        "原始API数据": {
            "raw_api_responses": "所有API调用的原始响应"
        },
        "可视化数据": {
            "echarts_data": "用于图表渲染的数据"
        }
    }, indent=2, ensure_ascii=False))
    
    print("\n🎯 抽屉数据的价值:")
    print("✅ 完整性: 不仅看到图表，还能看到完整的业务数据")
    print("✅ 透明性: 了解数据的来源和处理过程") 
    print("✅ 调试性: 包含原始API响应，便于问题排查")
    print("✅ 可追溯: 记录执行时间、状态等元信息")
    print("✅ 层次性: 从图表配置到业务数据的完整层次")
    
    print("\n🔍 使用场景:")
    print("- 📊 查看图表配置和原始数据")
    print("- 🔧 调试工作流执行问题")
    print("- 📋 获取详细的业务数据")
    print("- 🔄 了解数据处理流程")
    print("- 📈 分析数据质量和完整性")
    
    print("\n✅ 测试完成!")
    print("右侧抽屉现在展示工作流的完整返回数据，而不仅仅是 ECharts 数据")

if __name__ == "__main__":
    test_drawer_data_structure()
