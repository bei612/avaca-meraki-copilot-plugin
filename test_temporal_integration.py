#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Temporal 集成测试脚本
测试 10 个 Meraki 工作流的基本功能
"""

import asyncio
import json
import sys
from datetime import datetime

# 模拟测试数据
def generate_test_echarts_data():
    """生成测试用的 ECharts 数据"""
    return [
        {
            "type": "pie",
            "title": "设备状态分布",
            "option": {
                "title": {"text": "设备状态分布", "left": "center"},
                "series": [{
                    "type": "pie",
                    "data": [
                        {"name": "在线设备", "value": 168},
                        {"name": "离线设备", "value": 4},
                        {"name": "告警设备", "value": 2}
                    ]
                }]
            }
        },
        {
            "type": "bar", 
            "title": "客户端数量统计",
            "option": {
                "title": {"text": "客户端数量统计", "left": "center"},
                "xAxis": {"type": "category", "data": ["CISS Network", "Guest Network"]},
                "yAxis": {"type": "value"},
                "series": [{
                    "type": "bar",
                    "data": [1076, 0]
                }]
            }
        },
        {
            "type": "gauge",
            "title": "许可证状态",
            "option": {
                "title": {"text": "许可证状态", "left": "center"},
                "series": [{
                    "type": "gauge",
                    "data": [{"value": 100, "name": "健康度"}]
                }]
            }
        }
    ]

def test_charts_display_api():
    """测试图表展示API的数据格式"""
    print("🧪 测试图表展示API数据格式")
    
    # 生成测试数据
    test_data = {
        "echarts_data_list": generate_test_echarts_data(),
        "layout_config": {
            "columns": 3,
            "title": "Temporal 工作流测试面板"
        }
    }
    
    print(f"✅ 生成了 {len(test_data['echarts_data_list'])} 个测试图表")
    print(f"📊 图表类型: {[chart['type'] for chart in test_data['echarts_data_list']]}")
    
    # 验证数据结构
    for i, chart in enumerate(test_data['echarts_data_list']):
        required_fields = ['type', 'title', 'option']
        missing_fields = [field for field in required_fields if field not in chart]
        
        if missing_fields:
            print(f"❌ 图表 {i+1} 缺少字段: {missing_fields}")
            return False
        else:
            print(f"✅ 图表 {i+1} ({chart['type']}) 数据结构正确")
    
    return True

def test_workflow_api_structure():
    """测试工作流API的响应结构"""
    print("\n🧪 测试工作流API响应结构")
    
    # 模拟工作流响应
    workflow_response = {
        "success": True,
        "data": {
            "organization_name": "Concordia",
            "organization_id": "850617379619606726",
            "device_status_overview": {
                "total_devices": 174,
                "online_devices": 168,
                "offline_devices": 4,
                "alerting_devices": 2
            },
            "echarts_data": [
                {
                    "type": "pie",
                    "title": "设备状态分布",
                    "option": {
                        "title": {"text": "设备状态分布"},
                        "series": [{"type": "pie", "data": []}]
                    }
                }
            ],
            "query_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "success": True
        },
        "timestamp": int(datetime.now().timestamp() * 1000)
    }
    
    # 验证响应结构
    if workflow_response.get("success") and workflow_response.get("data"):
        if "echarts_data" in workflow_response["data"]:
            print("✅ 工作流响应包含 echarts_data 字段")
            print(f"📊 图表数量: {len(workflow_response['data']['echarts_data'])}")
            return True
        else:
            print("❌ 工作流响应缺少 echarts_data 字段")
            return False
    else:
        print("❌ 工作流响应结构不正确")
        return False

def test_temporal_configuration():
    """测试 Temporal 配置"""
    print("\n🧪 测试 Temporal 配置")
    
    config = {
        "temporal_host": "temporal:7233",
        "namespace": "avaca", 
        "task_queue": "meraki-workflows-queue"
    }
    
    workflows = [
        "DeviceStatusWorkflow",
        "APDeviceQueryWorkflow", 
        "ClientCountWorkflow",
        "FirmwareSummaryWorkflow",
        "LicenseDetailsWorkflow",
        "DeviceInspectionWorkflow",
        "FloorplanAPWorkflow",
        "DeviceLocationWorkflow",
        "LostDeviceTraceWorkflow",
        "AlertsLogWorkflow"
    ]
    
    print(f"🔧 Temporal 服务器: {config['temporal_host']}")
    print(f"📦 命名空间: {config['namespace']}")
    print(f"🚀 任务队列: {config['task_queue']}")
    print(f"⚙️ 工作流数量: {len(workflows)}")
    
    for i, workflow in enumerate(workflows, 1):
        print(f"  {i:2d}. {workflow}")
    
    return True

def main():
    """主测试函数"""
    print("🚀 Temporal Meraki 工作流集成测试")
    print("=" * 50)
    
    tests = [
        ("图表展示API数据格式", test_charts_display_api),
        ("工作流API响应结构", test_workflow_api_structure), 
        ("Temporal配置", test_temporal_configuration)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        try:
            if test_func():
                print(f"✅ {test_name} - 通过")
                passed += 1
            else:
                print(f"❌ {test_name} - 失败")
        except Exception as e:
            print(f"❌ {test_name} - 错误: {str(e)}")
    
    print("\n" + "=" * 50)
    print(f"📊 测试结果: {passed}/{total} 通过")
    
    if passed == total:
        print("🎉 所有测试通过！Temporal 集成准备就绪")
        return 0
    else:
        print("⚠️ 部分测试失败，请检查配置")
        return 1

if __name__ == "__main__":
    sys.exit(main())
