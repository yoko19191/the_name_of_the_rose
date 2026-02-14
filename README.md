# 玫瑰的名字（The Name of the Rose）

一个以“无限衍义”为核心隐喻的交互式概念网络应用。  
用户从一个词出发，系统按 `New 概念 -> 谓词 -> Old 概念` 持续展开，形成可视化语义迷宫。

## 项目地址

- GitHub: https://github.com/yoko19191/the_name_of_the_rose

## 核心特性

- 概念网络可视化（React Flow）
- 右键展开节点，生成“新概念 + 谓词 + 谓词解释”
- 连线中点显示小号谓词文本，悬浮可查看“为何使用该谓词”
- 右键空白处整理网络（分层径向 + 力导微调）
- 首节点固定为结构锚点，整理后视角自动回到首节点
- 首个输入概念自动成为网络名（左侧列表）
- 根节点常驻淡血红边框（即使灰化）
- 多网络管理（创建、切换、重命名、删除）
- 前端覆盖模型配置（OpenAI/Anthropic 的 Key 与 Base URL）
- localStorage 持久化 + 底部容量进度条 + 90% 告警

## 技术栈

- Next.js 16（App Router, Turbopack）
- React 19 + TypeScript
- Tailwind CSS
- React Flow（`@xyflow/react`）
- `d3-force`
- LangChain JS 1.x（`createAgent` + `initChatModel` + `responseFormat`）
- Zod（结构化输出校验）

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量（可选）

创建 `.env.local`：

```bash
# 默认模型（可选，不填时前端默认 gpt-5-mini）
MODEL_NAME=gpt-5-mini

# OpenAI 兼容
OPENAI_API_KEY=
OPENAI_BASE_URL=

# Anthropic 兼容
ANTHROPIC_API_KEY=
ANTHROPIC_BASE_URL=
```

说明：
- 右侧设置面板可直接填写覆盖配置（优先于环境变量）。
- 默认 `provider = openai`，默认 `model = gpt-5-mini`。

### 3. 启动开发

```bash
npm run dev
```

打开 http://localhost:3000

## 提示词管理

词语展开（含谓词生成）的提示词由文本模板控制：

- `prompts/generate-words.txt`

占位符：
- `{word}`
- `{background}`
- `{direction}`
- `{existingWords}`
- `{directionConstraint}`

说明：
- 修改该 txt 后，后端会读取模板并用于 `action=words`。
- 若模板读取失败，会自动回退到内置默认模板。

## 使用说明

1. 点击画布空白处，输入第一个概念。
2. 右键节点，选择自动/指定方向生成。
3. 观察 `New -> 谓词 -> Old` 的连线表达。
4. 右键空白处“整理网络”，提升可读性。
5. 关注底部细进度条，接近 90% 时按提示清理存储。

## 本地存储说明

- 当前数据保存在浏览器 `localStorage`。
- 底部细进度条显示占用估算（按 5MB 配额）。
- 超过 90% 会提示：
  1. 删除左侧不再需要的网络
  2. 清理浏览器该站点 Local Storage / Site Data

## 构建与运行

```bash
npm run build
npm run start
```

## Vercel 部署提示

- 在 Vercel 项目环境变量中配置：
  - `OPENAI_API_KEY` / `OPENAI_BASE_URL`
  - `ANTHROPIC_API_KEY` / `ANTHROPIC_BASE_URL`
  - `MODEL_NAME`（可选）
- API Route 使用 Node.js runtime。
- localStorage 数据是“按浏览器+域名隔离”的，不会跨设备同步。

## License

当前仓库未声明 License，如需开源发布建议补充 `LICENSE`。
