# 📋 双尾彗星本地资料导入操作指南

## 任务概述
将本地资料从 Mac 电脑复制到云端人格库目录 `personality_library/双尾彗星/local_materials/`

---

## 📁 源目录结构
```
/Users/quietLeaf/Coze/data/shuangweihuixing/
├── book/          (34个PDF文件，约1.8GB)
└── transcript/    (1个m4a音频文件，约49MB)
```

## 🎯 目标目录
```
personality_library/双尾彗星/local_materials/
├── book/          (存放PDF)
├── transcript/    (存放音频)
└── index.md       (已创建的资料索引)
```

---

## ✋ 手动复制方法（推荐）

### 方法一：直接拖拽
1. 在 Mac Finder 中打开源目录：`/Users/quietLeaf/Coze/data/shuangweihuixing/`
2. 在扣子对话界面打开文件管理，找到 `personality_library/双尾彗星/local_materials/`
3. 拖拽复制即可

### 方法二：使用终端命令
在 Mac 终端执行：
```bash
# 复制所有文件
cp -r /Users/quietLeaf/Coze/data/shuangweihuixing/* ./personality_library/双尾彗星/local_materials/

# 或者分别复制
cp -r /Users/quietLeaf/Coze/data/shuangweihuixing/book/* ./personality_library/双尾彗星/local_materials/book/
cp -r /Users/quietLeaf/Coze/data/shuangweihuixing/transcript/* ./personality_library/双尾彗星/local_materials/transcript/
```

---

## 📊 文件清单汇总

### 小文件 (<50MB) - 优先复制
| 文件名 | 大小 |
|--------|------|
| DeepSeekV4.pdf | 4.5MB |
| 东周列国故事新编.pdf | 5.9MB |
| 金赛性学报告.pdf | 5.4MB |
| 黑天鹅.pdf | 3.7MB |
| 玩学习之一.pdf | 10MB |
| 暗中的幽灵.pdf | 19MB |
| 海蒂性学报告.pdf | 17MB |
| 当代中国社会各阶层分析.pdf | 26MB |
| 怪诞行为学.pdf | 29MB |
| 中国军事通史01-09卷 | 各约8-20MB |
| 中国军事通史11-14卷 | 各约10-17MB |

### 中等文件 (50-150MB)
| 文件名 | 大小 |
|--------|------|
| 玩学习之二.pdf | 54MB |
| 当代中国政府过程.pdf | 76MB |
| 人类陆海空战史失误.pdf | 109MB |
| 国富论.pdf | 130MB |
| 金瓶梅.pdf | 158MB |

### 超大文件 (>150MB) - 可选跳过
| 文件名 | 大小 | 建议 |
|--------|------|------|
| 东周列国志.pdf | 186MB | 可选 |
| 人类战史失误.pdf | 189MB | 可选 |
| 孙子兵法.pdf | 821MB | **建议跳过** |

### 音频文件
| 文件名 | 大小 |
|--------|------|
| 20260316拼总督谈话.m4a | 49MB |

---

## ✅ 复制完成后

复制完成后，请在此对话中回复"已复制"，我将自动执行以下步骤：

1. **解析PDF** - 提取文本内容（从直播推荐书籍开始）
2. **蒸馏知识** - 提取与双尾彗星人设相关的要点
3. **更新配置** - 更新 KNOWLEDGE.md 和 distillation_notes.md

---

## ⏱️ 预计处理时间

| 阶段 | 预计时间 |
|------|----------|
| 小文件解析 (20个) | 约30分钟 |
| 中等文件解析 (5个) | 约1小时 |
| 知识蒸馏 | 约30分钟 |
| **总计** | 约2小时 |

---

## 📝 注意事项

1. **超大文件**：孙子兵法(821MB)建议跳过，parse_file可能失败
2. **并行处理**：我会同时处理多个小文件以提高效率
3. **断点续传**：如果中断，索引文件会记录已处理状态
