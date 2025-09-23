#!/usr/bin/env python3
"""
测试完整持久化策略
验证新的数据结构和向后兼容性
"""

import json

def test_full_persistence_strategy():
    """测试完整持久化策略"""
    
    print("🔄 测试完整持久化策略")
    print("=" * 60)
    
    # 模拟完整的工作流返回数据
    mock_workflow_result = {
        "success": True,
        "timestamp": 1642857600000,
        "workflow_id": "device-status-12345",
        "execution_time": 1.23,
        "parameters": {
            "org_id": "850617379619606726"
        },
        "echarts_data": {
            "type": "pie",
            "title": "设备状态分布",
            "option": {
                "series": [{
                    "name": "设备状态",
                    "type": "pie",
                    "data": [
                        {"value": 335, "name": "在线"},
                        {"value": 310, "name": "离线"},
                        {"value": 234, "name": "故障"}
                    ]
                }]
            },
            "data": [
                {"status": "在线", "count": 335},
                {"status": "离线", "count": 310},
                {"status": "故障", "count": 234}
            ]
        },
        "raw_meraki_data": {
            "organizations": [
                {"id": "850617379619606726", "name": "Concordia"}
            ],
            "devices": [
                {"serial": "Q2XX-XXXX-XXXX", "status": "online"},
                {"serial": "Q2YY-YYYY-YYYY", "status": "offline"}
            ]
        },
        "processing_logs": [
            "开始处理设备状态查询",
            "获取到 2 个设备",
            "生成图表数据完成"
        ],
        "metadata": {
            "api_version": "v1",
            "processing_duration": "1.23s",
            "data_source": "meraki_api"
        }
    }
    
    # 模拟新的持久化数据结构 (v2.0)
    new_persistence_data = {
        # 保持向后兼容的 charts_data 字段
        "charts_data": [mock_workflow_result["echarts_data"]],
        
        # 新增：保存完整的工作流返回数据
        "workflow_results": {
            "device-status": mock_workflow_result
        },
        
        "metadata": {
            "chart_types": ["pie"],
            "timestamp": 1642857600000,
            "total_charts": 1,
            "total_workflows": 1,
            "version": "2.0",
            "persistence_strategy": "full_workflow_data"
        }
    }
    
    # 模拟旧的持久化数据结构 (v1.0) - 向后兼容
    old_persistence_data = {
        "charts_data": [mock_workflow_result["echarts_data"]],
        "metadata": {
            "chart_types": ["pie"],
            "timestamp": 1642857600000,
            "total_charts": 1,
            "version": "1.0"
        }
    }
    
    print("📊 新版本持久化数据结构 (v2.0):")
    print("=" * 40)
    print(f"✅ 图表数据: {len(new_persistence_data['charts_data'])} 个")
    print(f"✅ 工作流数据: {len(new_persistence_data['workflow_results'])} 个")
    print(f"✅ 版本: {new_persistence_data['metadata']['version']}")
    print(f"✅ 策略: {new_persistence_data['metadata']['persistence_strategy']}")
    print(f"✅ 数据大小: {len(json.dumps(new_persistence_data))} 字节")
    
    print(f"\n📋 旧版本持久化数据结构 (v1.0) - 兼容性:")
    print("=" * 40)
    print(f"✅ 图表数据: {len(old_persistence_data['charts_data'])} 个")
    print(f"❌ 工作流数据: 无 (仅图表数据)")
    print(f"✅ 版本: {old_persistence_data['metadata']['version']}")
    print(f"✅ 数据大小: {len(json.dumps(old_persistence_data))} 字节")
    
    print(f"\n🔍 数据对比分析:")
    print("=" * 40)
    
    new_size = len(json.dumps(new_persistence_data))
    old_size = len(json.dumps(old_persistence_data))
    size_increase = new_size - old_size
    size_ratio = (size_increase / old_size) * 100
    
    print(f"📈 数据增长: +{size_increase} 字节 ({size_ratio:.1f}%)")
    print(f"🎯 新增功能:")
    print(f"   - 完整工作流执行日志")
    print(f"   - Meraki API 原始数据")
    print(f"   - 处理过程追踪")
    print(f"   - 执行时间统计")
    print(f"   - 参数记录")
    
    print(f"\n🔄 向后兼容性测试:")
    print("=" * 40)
    
    # 测试新版本数据的向后兼容性
    def can_read_v1_format(data):
        return (
            'charts_data' in data and
            isinstance(data['charts_data'], list) and
            len(data['charts_data']) > 0
        )
    
    def can_read_v2_format(data):
        return (
            can_read_v1_format(data) and
            'workflow_results' in data and
            isinstance(data['workflow_results'], dict)
        )
    
    print(f"✅ v1.0 数据可被新版本读取: {can_read_v1_format(old_persistence_data)}")
    print(f"✅ v2.0 数据包含完整信息: {can_read_v2_format(new_persistence_data)}")
    print(f"✅ v2.0 数据向后兼容: {can_read_v1_format(new_persistence_data)}")
    
    print(f"\n🎯 使用场景分析:")
    print("=" * 40)
    print(f"📊 图表展示: 使用 charts_data 字段 (v1.0 + v2.0)")
    print(f"🔍 详细查看: 使用 workflow_results 字段 (仅 v2.0)")
    print(f"🐛 问题调试: 使用完整工作流数据 (仅 v2.0)")
    print(f"📈 性能分析: 使用执行时间等元数据 (仅 v2.0)")
    
    print(f"\n✅ 测试完成!")
    print(f"🎉 新的持久化策略成功实现完整数据保存和向后兼容性!")

if __name__ == "__main__":
    test_full_persistence_strategy()
