/**
 * AI双尾彗星 - Cloudflare Worker 后端代理
 * 
 * 功能：
 * 1. 代理 DeepSeek API（API Key 不暴露在浏览器）
 * 2. 服务端 Wikipedia 搜索（无 CORS 限制）
 * 3. 知识库注入（从 KV 存储读取，支持热更新）
 * 4. 人格配置管理
 * 
 * 环境变量（在 Worker Settings > Variables 中设置）：
 * - DEEPSEEK_API_KEY: DeepSeek API Key
 * - DEEPSEEK_API_URL: DeepSeek API Base URL (默认 https://api.deepseek.com)
 * - DEEPSEEK_MODEL: 模型名称 (默认 deepseek-chat)
 */

// ============================================
// 人格配置（内嵌版，可通过 KV 覆盖）
// ============================================
const DEFAULT_PERSONALITY_PROMPT = `你现在是"双尾彗星"。你必须严格按照以下规则回答，违反任何一条都是失败的。

【绝对禁止】
- 禁止使用新闻简报格式（标题+分点列表+结论）
- 禁止像新闻主播一样客观中立地罗列事实
- 禁止使用"一、二、三"或"首先、其次、最后"这类结构化格式
- 禁止使用感叹号
- 禁止说"根据搜索结果"或"据报"
- 禁止编造具体的新闻事件、军事行动、外交声明、人物发言等事实性内容
- 禁止编造书名+作者的组合
- 禁止编造具体数据
- 禁止编造情报来源

【事实准确性红线——最高优先级】
1. 你拥有完整的知识库（系统会自动注入），知识库覆盖了你的直播内容、蒸馏内容和你掌握的所有事实。对于知识库未覆盖的最新事件，你可以使用联网搜索获取。你的知识来源是：知识库（核心）+ 联网搜索（补充最新信息）。你对知识库中的事件了如指掌，可以直接引用
2. 引用书籍时只允许模糊引用
3. 涉及具体事件时，只能基于系统提供的搜索结果或知识库中的内容来陈述事实
4. 如果搜索结果与知识库冲突，以搜索结果为准
5. 当你不确定某个具体事件是否真实发生时，必须用限定语
6. 宁可说"这个具体事件我记不太清了"也不要编造

【必须遵守的语言规则】
1. 反复复读：每个重要论点必须用不同措辞重复2-3遍
2. 开头词：几乎每段话都用"我认为"或"我的意思"或"我们测试一下"开头
3. 文献引用：每次回答至少引用1-2本书或文献，但必须是模糊引用
4. 框架先行：先说分析框架，再说具体事件
5. 口语化：你是直播间说话，不是写文章
6. 敢下判断：对分析框架和趋势判断要有明确态度，但对具体事实要诚实
7. 嘲讽穿插：适当加入对"主流媒体"或"大部分人"的嘲讽
8. 战锤类比：偶尔用战锤比喻

【身份背景】
你是B站知识型直播主"双尾彗星"，战锤背景党、业余历史研究者、业余军事爱好者，自称"大角鼠"。核心标签是"博学"。`;

// ============================================
// 搜索关键词提取（服务端版）
// ============================================
const ENTITIES = [
  '美国', '以色列', '伊朗', '俄罗斯', '乌克兰', '中国', '中东',
  '叙利亚', '黎巴嫩', '真主党', '哈马斯', '胡塞武装', '摩萨德',
  '核武器', '核协议', '铀浓缩', '制裁', '停火', '停战',
  '拜登', '特朗普', '内塔尼亚胡', '哈梅内伊', '普京', '泽连斯基',
  '波斯湾', '红海', '霍尔木兹海峡', '戈兰高地', '加沙',
  '北约', '联合国', '欧盟', 'IAEA',
  '伊朗核', '以伊冲突', '美伊关系', '中东局势',
  '杜鲁门号', '航母', '驱逐舰', '防空导弹', '铁穹',
  '核设施', '浓缩铀', '代理人战争', '军事基地'
];

const ABBR_MAP = {
  '美以伊': ['美国', '以色列', '伊朗'],
  '美伊': ['美国', '伊朗'],
  '以伊': ['以色列', '伊朗'],
  '俄乌': ['俄罗斯', '乌克兰'],
  '中美': ['中国', '美国'],
  '美俄': ['美国', '俄罗斯'],
};

const EN_MAP = {
  '伊朗': 'Iran', '以色列': 'Israel', '美国': 'USA', '俄罗斯': 'Russia',
  '中东': 'Middle East', '叙利亚': 'Syria', '核协议': 'nuclear deal',
  '制裁': 'sanctions', '哈马斯': 'Hamas', '真主党': 'Hezbollah',
  '胡塞武装': 'Houthis', '乌克兰': 'Ukraine'
};

const SEARCH_KEYWORDS = [
  '最新', '今天', '现在', '刚刚', '局势', '动态', '新闻', '发生',
  '战争', '冲突', '协议', '谈判', '制裁', '伊朗', '以色列', '美国',
  '俄罗斯', '乌克兰', '中东', '叙利亚', '黎巴嫩', '真主党',
  '上周', '本周', '昨天', '这几天', '近期', '最近', '目前'
];

const TIME_WORDS = ['最新', '近一周', '今天', '昨天', '本周', '上周', '最近', '目前', '现在', '近期'];

function needsSearch(text) {
  return SEARCH_KEYWORDS.some(kw => text.includes(kw));
}

function extractKeywords(text) {
  const found = new Set();

  // 展开简称
  for (const [abbr, fulls] of Object.entries(ABBR_MAP)) {
    if (text.includes(abbr)) {
      fulls.forEach(f => found.add(f));
    }
  }

  // 匹配实体
  for (const entity of ENTITIES) {
    if (text.includes(entity)) found.add(entity);
  }

  // 时间词
  let timeHint = '';
  for (const tw of TIME_WORDS) {
    if (text.includes(tw)) { timeHint = tw; break; }
  }

  const entities = [...found];
  const queries = [];

  if (entities.length >= 2) {
    queries.push(entities.slice(0, 3).join(' '));
  }
  if (entities.length >= 1) {
    if (timeHint) queries.push(`${entities[0]} ${timeHint}`);
    queries.push(entities[0]);
  }

  // 兜底
  if (queries.length === 0) {
    const cleaned = text.replace(/[，。！？、；：""''（）【】《》\s]+/g, ' ').trim();
    if (cleaned.length > 2) queries.push(cleaned.substring(0, 20));
  }

  return { entities, timeHint, queries: [...new Set(queries)].slice(0, 3) };
}

// ============================================
// Wikipedia 搜索（服务端，无 CORS 限制）
// ============================================
async function searchWikipedia(query, lang = 'zh') {
  const results = [];
  try {
    const baseUrl = lang === 'zh'
      ? 'https://zh.wikipedia.org/w/api.php'
      : 'https://en.wikipedia.org/w/api.php';

    const url = new URL(baseUrl);
    url.searchParams.set('action', 'query');
    url.searchParams.set('list', 'search');
    url.searchParams.set('srsearch', query);
    url.searchParams.set('srlimit', lang === 'zh' ? '5' : '3');
    url.searchParams.set('format', 'json');
    url.searchParams.set('srprop', 'snippet|timestamp');
    if (lang === 'zh') url.searchParams.set('origin', '*');

    const resp = await fetch(url.toString(), {
      signal: AbortSignal.timeout(8000)
    });
    if (!resp.ok) return results;

    const data = await resp.json();
    const items = data?.query?.search || [];

    for (const item of items) {
      const snippet = item.snippet
        .replace(/<[^>]+>/g, '')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();

      results.push({
        title: item.title,
        snippet,
        source: lang === 'zh' ? 'Wikipedia' : 'Wikipedia(EN)',
        url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(item.title)}`,
        date: item.timestamp ? item.timestamp.split('T')[0] : ''
      });
    }
  } catch (e) {
    console.warn(`Wikipedia ${lang} search failed:`, query, e.message);
  }
  return results;
}

async function performSearch(userText) {
  const allResults = [];
  const seenTitles = new Set();

  const { entities, queries } = extractKeywords(userText);
  const searchQueries = queries.length > 0 ? queries : [userText.substring(0, 30)];

  for (const q of searchQueries) {
    // 中文 Wikipedia
    const zhResults = await searchWikipedia(q, 'zh');
    for (const r of zhResults) {
      if (!seenTitles.has(r.title)) {
        seenTitles.add(r.title);
        allResults.push(r);
      }
    }

    // 英文 Wikipedia（补充国际视角）
    if (entities.length > 0) {
      const enQuery = entities
        .map(e => EN_MAP[e] || e)
        .filter(e => /^[A-Za-z\s]/.test(e) || EN_MAP[e])
        .join(' ');
      if (enQuery) {
        const enResults = await searchWikipedia(enQuery, 'en');
        for (const r of enResults) {
          if (!seenTitles.has(r.title)) {
            seenTitles.add(r.title);
            allResults.push(r);
          }
        }
      }
    }

    if (allResults.length >= 8) break;
  }

  return allResults;
}

function formatSearchResults(results) {
  if (results.length === 0) {
    return '\n\n【搜索提示】搜索引擎未返回直接相关的最新结果。请基于你的知识库进行框架性分析——你的知识库中有大量事实储备，可以直接引用。绝对禁止编造知识库和搜索结果中都不存在的具体事件、数据、人名、书名。';
  }

  let text = '\n\n## 以下搜索结果来自真实搜索引擎，你可以引用其中的事实\n';
  results.forEach((r, i) => {
    text += `\n[${i + 1}] ${r.title}（来源：${r.source}`;
    if (r.date) text += `，日期：${r.date}`;
    text += `）`;
    if (r.snippet) text += `\n    ${r.snippet}`;
    if (r.url) text += `\n    链接：${r.url}`;
    text += '\n';
  });
  text += '\n【重要】以上搜索结果来自真实搜索引擎。你应当优先使用搜索结果中的最新事实，结合你的知识库进行框架性分析。不要编造搜索结果和知识库中都不存在的具体事件。';
  return text;
}

// ============================================
// CORS Headers
// ============================================
function corsHeaders(origin) {
  const allowedOrigins = [
    'https://326629110.github.io',
    'http://localhost:8080',
    'http://localhost:3000',
    'http://127.0.0.1:5500'
  ];

  const allowOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

// ============================================
// 主处理逻辑
// ============================================
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    // ---- 健康检查 ----
    if (url.pathname === '/health' || url.pathname === '/') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'AI双尾彗星 Worker',
        version: '1.0.0',
        features: ['deepseek_proxy', 'wikipedia_search', 'knowledge_base']
      }), {
        headers: { 'Content-Type': 'application/json', ...cors }
      });
    }

    // ---- 知识库更新接口（用于热更新）----
    if (url.pathname === '/admin/update-kb' && request.method === 'POST') {
      const adminKey = request.headers.get('X-Admin-Key');
      if (adminKey !== env.ADMIN_KEY) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...cors }
        });
      }

      const body = await request.json();
      if (body.knowledge_base && env.KB_STORE) {
        await env.KB_STORE.put('knowledge_base', JSON.stringify(body.knowledge_base));
        return new Response(JSON.stringify({ success: true, message: 'Knowledge base updated' }), {
          headers: { 'Content-Type': 'application/json', ...cors }
        });
      }

      if (body.personality_prompt && env.KB_STORE) {
        await env.KB_STORE.put('personality_prompt', body.personality_prompt);
        return new Response(JSON.stringify({ success: true, message: 'Personality prompt updated' }), {
          headers: { 'Content-Type': 'application/json', ...cors }
        });
      }

      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...cors }
      });
    }

    // ---- 聊天接口（核心）----
    if (url.pathname === '/chat' && request.method === 'POST') {
      try {
        const { messages, user_query } = await request.json();

        // 1. 加载知识库（从 KV 或使用默认）
        let knowledgeBase = '';
        let personalityPrompt = DEFAULT_PERSONALITY_PROMPT;

        if (env.KB_STORE) {
          const kbData = await env.KB_STORE.get('knowledge_base', 'json');
          if (kbData) {
            const parts = [];
            if (kbData.KNOWLEDGE) parts.push('【知识库——你的事实储备】\n' + kbData.KNOWLEDGE);
            if (kbData.DISTILLATION) parts.push('【蒸馏笔记——你的经历和风格来源】\n' + kbData.DISTILLATION);
            if (kbData.PERSONALITY) parts.push('【人格定义】\n' + kbData.PERSONALITY);
            if (kbData.SYSTEM_PROMPT) parts.push('【系统指令】\n' + kbData.SYSTEM_PROMPT);
            knowledgeBase = parts.join('\n\n---\n\n');
          }

          const customPrompt = await env.KB_STORE.get('personality_prompt', 'text');
          if (customPrompt) personalityPrompt = customPrompt;
        }

        // 2. 搜索最新信息
        let searchContext = '';
        if (user_query && needsSearch(user_query)) {
          const searchResults = await performSearch(user_query);
          searchContext = formatSearchResults(searchResults);
        }

        // 3. 构造 system prompt
        const now = new Date();
        const timeStr = now.toLocaleString('zh-CN', {
          timeZone: 'Asia/Shanghai',
          year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
          hour: '2-digit', minute: '2-digit'
        });

        let systemContent = personalityPrompt;
        if (knowledgeBase) {
          systemContent += '\n\n' + knowledgeBase;
        }
        systemContent += '\n\n当前时间：' + timeStr;
        systemContent += '\n\n【重要】以上知识库内容是你的事实储备，你对其中的事件和框架非常熟悉。对于知识库中未覆盖的最新事件，请使用搜索结果。绝对不要说"我的数据库截止到某年某月"——你有知识库+联网搜索，不存在知识截止的问题。';
        systemContent += searchContext;

        // 4. 构造 API 请求
        const apiMessages = [
          { role: 'system', content: systemContent },
          ...(messages || [])
        ];

        const apiUrl = env.DEEPSEEK_API_URL || 'https://api.deepseek.com';
        const apiKey = env.DEEPSEEK_API_KEY;
        const model = env.DEEPSEEK_MODEL || 'deepseek-chat';

        if (!apiKey) {
          return new Response(JSON.stringify({
            error: 'DeepSeek API Key not configured. Set DEEPSEEK_API_KEY in Worker environment variables.'
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...cors }
          });
        }

        // 5. 调用 DeepSeek API（streaming）
        const deepseekResp = await fetch(`${apiUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: apiMessages,
            max_tokens: 2000,
            temperature: 0.3,
            stream: true,
            thinking: { type: 'enabled' }
          })
        });

        if (!deepseekResp.ok) {
          const errText = await deepseekResp.text();
          return new Response(JSON.stringify({
            error: `DeepSeek API error: ${deepseekResp.status}`,
            detail: errText
          }), {
            status: deepseekResp.status,
            headers: { 'Content-Type': 'application/json', ...cors }
          });
        }

        // 6. 流式返回给浏览器
        const responseHeaders = {
          ...cors,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        };

        return new Response(deepseekResp.body, { headers: responseHeaders });

      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...cors }
        });
      }
    }

    // ---- 404 ----
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...cors }
    });
  }
};
