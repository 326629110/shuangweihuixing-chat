# BV号获取错误复盘（2026-06-18）

## 事件经过

6月17日双尾彗星发布官方视频《停火协议，能赢吗？》，需要获取BV号用于ASR转写。

| 方法 | 结果 | 问题 |
|------|------|------|
| mobile_use 云手机B站APP搜索 | 返回 BV1cH4y1m7wN | 错误！实际是"阿征数学"的数列课视频 |
| B站 web search API | 搜索不到目标视频 | API可能对新视频有延迟或审核过滤 |
| 用户提供分享链接 | BV1NsjL6FEvd ✅ | 唯一可靠方式 |

## 根因分析

1. **云手机B站APP搜索不可靠**：搜索结果排序受个性化推荐影响，OCR识别搜索结果时可能错位（点到了错误的结果项）
2. **B站 search API 对特定内容有延迟**：新发布视频可能不会立即出现在搜索结果中
3. **缺少BV号验证环节**：获取到BV号后，没有用API二次验证标题和作者是否匹配

## 防范措施（标准化流程）

### 获取BV号的优先级排序

1. **用户提供分享链接** → 最可靠，直接提取BV号
2. **B站 space API 按 UP主 UID 查最新视频** → `https://api.bilibili.com/x/space/wbi/arc/search?mid={uid}&ps=5&pn=1&order=pubdate`
3. **云手机B站APP搜索** → 仅作为辅助确认手段，不作为主要获取方式

### BV号验证（强制）

无论通过何种方式获取BV号，**必须**执行以下验证：

```python
import urllib.request, json
bvid = 'BV1NsjL6FEvd'
url = f'https://api.bilibili.com/x/web-interface/view?bvid={bvid}'
req = urllib.request.Request(url, headers={
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Referer': 'https://www.bilibili.com/'
})
resp = urllib.request.urlopen(req, timeout=15)
data = json.loads(resp.read())
# 必须验证：标题、作者名、时长
print(f'标题: {data["data"]["title"]}')
print(f'作者: {data["data"]["owner"]["name"]}')
print(f'时长: {data["data"]["duration"]}秒')
```

**验证标准：**
- 作者名必须包含"双尾彗星"（本体）或"斯卡文档案管理员"/"录播组"（录播源）
- 标题必须与预期内容匹配
- 时长必须合理（录播通常2-4小时，官方视频通常15-30分钟）

### 转写脚本中的BV号

- BV号写入脚本前必须已完成验证
- 脚本开头注释中同时标注BV号和验证过的标题/作者
- 执行转写前脚本自动检查BV号有效性

## 经验总结

- 云手机APP搜索的OCR识别存在系统性误差风险，不适合作为精确数据获取手段
- B站API按UID查视频列表比搜索API更可靠、更精准
- 任何自动化获取的数据，在用于生产流程前必须做交叉验证
