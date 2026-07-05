# AI双尾彗星 - Cloudflare Worker 部署指南

## 架构说明

```
浏览器（GitHub Pages）
    ↓ POST /chat
Cloudflare Worker（后端代理）
    ├── Wikipedia 搜索（服务端，无 CORS 限制）
    ├── 知识库读取（KV 存储，可热更新）
    ├── 人格配置（KV 存储或内嵌）
    └── DeepSeek API（Key 藏在后端）
```

## 部署步骤

### 第一步：注册 Cloudflare 账号
1. 访问 https://dash.cloudflare.com/sign-up
2. 注册免费账号（邮箱验证）

### 第二步：安装 Wrangler CLI（在你的 Mac 上）
```bash
npm install -g wrangler
```

### 第三步：登录 Cloudflare
```bash
wrangler login
```

### 第四步：创建 KV 命名空间
```bash
cd /Users/quietLeaf/Coze/data/shuangweihuixing/worker
wrangler kv:namespace create KB_STORE
```
记住返回的 ID，替换 `wrangler.toml` 中的 `YOUR_KV_NAMESPACE_ID`

### 第五步：设置密钥
```bash
wrangler secret put DEEPSEEK_API_KEY
# 输入: sk-d9a0c42219f14b3e96adec18c00bba49

wrangler secret put ADMIN_KEY
# 输入: 一个自定义的管理密钥（用于远程更新知识库）
```

### 第六步：上传知识库到 KV
```bash
# 将知识库 JSON 上传到 KV
wrangler kv:key put --binding KB_STORE knowledge_base --path=../../knowledge_base.json
```

### 第七步：部署 Worker
```bash
wrangler deploy
```

部署成功后会显示 Worker URL，类似：
`https://ai-shuangweihuixing.xxx.workers.dev`

### 第八步：更新前端代码
修改 `index.html` 中的 API 地址：
```javascript
const DEEPSEEK_API_URL = 'https://ai-shuangweihuixing.xxx.workers.dev/chat';
```

## 热更新知识库

部署后，可以随时更新知识库而无需重新部署：

```bash
# 方法1：通过 wrangler 命令
wrangler kv:key put --binding KB_STORE knowledge_base --path=new_knowledge_base.json

# 方法2：通过 HTTP API
curl -X POST https://ai-shuangweihuixing.xxx.workers.dev/admin/update-kb \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: 你的ADMIN_KEY" \
  -d @knowledge_base.json
```

## 费用

- Cloudflare Workers 免费额度：每天 10 万次请求
- KV 存储免费额度：每天 10 万次读取 + 1000 次写入
- 完全够个人使用，零成本
