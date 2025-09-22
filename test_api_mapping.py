#!/usr/bin/env python3
"""
测试 API 名称映射
验证 manifest.json 中的 API 名称与 TemporalPlugin.tsx 中的映射是否一致
"""

import json
import re

def test_api_mapping():
    """测试 API 映射"""
    
    print("🔗 测试 API 名称映射")
    print("=" * 50)
    
    # 从 manifest.json 读取 API 名称
    try:
        with open('public/manifest.json', 'r', encoding='utf-8') as f:
            manifest = json.load(f)
        
        manifest_apis = []
        for api in manifest.get('api', []):
            if 'name' in api:
                manifest_apis.append(api['name'])
        
        print("📋 manifest.json 中的 API 名称:")
        for api in manifest_apis:
            print(f"  - {api}")
        
    except Exception as e:
        print(f"❌ 读取 manifest.json 失败: {e}")
        return
    
    # 从 TemporalPlugin.tsx 读取映射
    try:
        with open('src/components/TemporalPlugin.tsx', 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 提取 apiToWorkflowMap 中的 API 名称
        pattern = r"'([^']+)':\s*'[^']+'"
        matches = re.findall(pattern, content)
        
        plugin_apis = []
        for match in matches:
            if match not in ['workflow_ids']:  # 排除非 API 的键
                plugin_apis.append(match)
        
        print(f"\n🔧 TemporalPlugin.tsx 中的 API 映射:")
        for api in plugin_apis:
            print(f"  - {api}")
        
    except Exception as e:
        print(f"❌ 读取 TemporalPlugin.tsx 失败: {e}")
        return
    
    # 检查映射一致性
    print(f"\n🔍 映射一致性检查:")
    
    manifest_set = set(manifest_apis)
    plugin_set = set(plugin_apis)
    
    # 排除 displayMultipleCharts，它不需要映射
    manifest_set.discard('displayMultipleCharts')
    
    missing_in_plugin = manifest_set - plugin_set
    extra_in_plugin = plugin_set - manifest_set
    
    if not missing_in_plugin and not extra_in_plugin:
        print("✅ 所有 API 映射都正确!")
    else:
        if missing_in_plugin:
            print("❌ 在插件映射中缺失的 API:")
            for api in missing_in_plugin:
                print(f"  - {api}")
        
        if extra_in_plugin:
            print("⚠️  插件映射中多余的 API:")
            for api in extra_in_plugin:
                print(f"  - {api}")
    
    # 显示完整的映射关系
    print(f"\n📊 完整的 API 到工作流映射:")
    
    api_to_workflow = {
        'getDeviceStatus': 'device-status',
        'queryAPDevices': 'ap-device-query',
        'getClientCount': 'client-count',
        'getFirmwareSummary': 'firmware-summary',
        'getLicenseDetails': 'license-details',
        'getDeviceInspection': 'device-inspection',
        'getFloorplanAP': 'floorplan-ap',
        'getDeviceLocation': 'device-location',
        'traceLostDevice': 'lost-device-trace',
        'getAlertsLog': 'alerts-log'
    }
    
    for api_name, workflow_id in api_to_workflow.items():
        status = "✅" if api_name in manifest_set else "❌"
        print(f"  {status} {api_name} -> {workflow_id}")
    
    print(f"\n🎯 特殊说明:")
    print("  - displayMultipleCharts: 不需要映射，直接处理多个图表")
    print("  - traceLostDevice: 对应 lost-device-trace 工作流")
    print("  - queryAPDevices: 对应 ap-device-query 工作流")
    
    print(f"\n✅ 测试完成!")

if __name__ == "__main__":
    test_api_mapping()
