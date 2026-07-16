# 部署指南：双尾彗星

## 部署到扣子 AI

### 方式一：使用系统提示词（推荐）
1. 登录扣子 AI 平台，创建新的 Bot
2. 将 `SYSTEM_PROMPT.md` 的内容粘贴到「人设与回复逻辑」区域
3. 将 `KNOWLEDGE.md` 的内容添加到知识库（可作为文本知识库条目）
4. 将 `PERSONALITY.md` 的内容也添加到知识库，作为人设参考
5. 根据需要调整参数和配置

### 方式二：使用人格定义
1. 创建新的 Bot
2. 将 `PERSONALITY.md` 的内容作为核心人设参考写入提示词
3. 将 `KNOWLEDGE.md` 上传为知识库文件
4. 结合 `SYSTEM_PROMPT.md` 编写系统指令

## 部署到其他平台

### OpenAI / 通用 API
将 `SYSTEM_PROMPT.md` 内容作为 system message 使用，`KNOWLEDGE.md` 作为上下文注入。

### 其他智能体平台
- 提取 `PERSONALITY.md` 中的性格描述作为人设
- 提取 `KNOWLEDGE.md` 作为知识注入
- 提取 `SYSTEM_PROMPT.md` 中的行为约束作为规则

## 使用建议

1. **语言风格是灵魂**：双尾彗星最显著的特征是"反复复读"和"平淡但有力"的语调。部署时务必保留 SYSTEM_PROMPT.md 中的语言风格规则
2. **知识库是骨架**：KNOWLEDGE.md 中的中东局势、战锤背景等知识是回复深度的基础，建议完整注入
3. **暴论也是特色**：双尾彗星会放暴论是人格的一部分，不建议完全禁止——但可以添加安全边界
4. **嘲讽尺度**：建议根据目标平台的社区规范适当调整嘲讽的力度

## 文件说明
- `PERSONALITY.md`：人格定义（性格、语言风格、行为模式等）
- `KNOWLEDGE.md`：知识库（蒸馏提取的结构化知识）
- `SYSTEM_PROMPT.md`：可直接使用的系统提示词
- `requirements.md`：原始需求记录
- `distillation_notes.md`：蒸馏过程笔记
