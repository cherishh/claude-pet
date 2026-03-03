# Desktop Pet — 技术架构文档

## 概览

Desktop Pet 是一个基于 Tauri v2 的桌面宠物应用。像素风龙虾角色在桌面上展示各种动画状态，并通过 CLI 集成 AI 对话能力。

核心设计原则：**配置驱动（Config-Driven）**。角色外观和 AI 后端均通过 JSON 配置文件定义，无需修改代码即可替换。

## 系统架构

```
┌──────────────────────────────────────────────────────────────┐
│                        Tauri App                             │
│                                                              │
│   Pet Window (透明/置顶)            Chat Window (按需显示)    │
│   ┌─────────────────────┐          ┌──────────────────────┐  │
│   │  PetWindow.tsx       │  Events  │  ChatWindow.tsx      │  │
│   │  ├─ PetSprite.tsx    │◄────────│  ├─ ChatMessages.tsx  │  │
│   │  ├─ useAnimationState│ "pet-   │  ├─ ChatInput.tsx     │  │
│   │  └─ useSpriteAnimation reaction"│  └─ useAIChat.ts     │  │
│   └─────────────────────┘          └──────────┬───────────┘  │
│              │                                 │              │
│              │ SpriteMeta                      │ AIProvider   │
│              ▼                                 ▼              │
│   ┌─────────────────┐              ┌──────────────────────┐  │
│   │ sprite-meta.json │              │  ai-provider.json    │  │
│   │ spritesheet.png  │              │  (binary/args/env)   │  │
│   └─────────────────┘              └──────────┬───────────┘  │
│                                                │              │
│   ┌────────────────────────────────────────────┴───────────┐ │
│   │                   Rust Backend                          │ │
│   │  commands/ai.rs     — spawn AI CLI + stream 解析        │ │
│   │  commands/window.rs — 窗口控制 + click-through          │ │
│   │  lib.rs             — 插件注册 + 系统托盘               │ │
│   └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

## 配置驱动设计

### sprite-meta.json — 角色定义

```json
{
  "character": { "name": "Lobster", "displaySize": 128 },
  "spriteWidth": 32, "spriteHeight": 32, "cols": 8,
  "animations": {
    "idle-breathe": { "row": 0, "frames": 4, "frameInterval": 300, "loop": true, "category": "idle" },
    ...
  }
}
```

**关键字段：**

| 字段 | 作用 |
|------|------|
| `character.name` | 角色名（供显示） |
| `character.displaySize` | 渲染尺寸（px），替代硬编码的 `SCALE` 常量 |
| `category` | 动画分类，驱动行为逻辑（见下表） |

**AnimationCategory 行为映射：**

| Category | 行为 |
|----------|------|
| `idle` | 自动循环（8s 切换），初始状态 |
| `sleep` | 60s 无操作后触发 |
| `poke` | 单击随机触发，播放一次后回到 idle |
| `greet` | 双击触发（打招呼），播放一次后回到 idle |
| `reaction` | AI 对话状态驱动（如 thinking），循环播放直到状态改变 |

**添加新动画只需：** 在 JSON 添加一行 + 在 spritesheet.png 添加对应行，零代码改动。

### ai-provider.json — AI 后端配置

```json
{
  "name": "Claude",
  "displayName": "Claude",
  "binary": "claude",
  "envRemove": ["CLAUDECODE"],
  "args": ["--print", "--output-format", "stream-json"],
  "streamFormat": "claude-stream-json",
  "checkCommand": "which",
  "installUrl": "https://docs.anthropic.com/en/docs/claude-code"
}
```

前端加载此配置后透传给 Rust 后端。Rust 端通过 allowlist 验证 `binary` 和 `checkCommand` 的合法性。

## 模块详解

### 前端 — Pet 窗口

```
PetWindow.tsx
├── useAnimationState()  → { state, meta, triggerState, returnToIdle }
│   ├── 加载 SpriteMeta
│   ├── idle 循环（8s，从 category="idle" 的动画中轮转）
│   ├── sleep 超时（60s，触发 category="sleep" 动画）
│   ├── 非循环动画自动回 idle（duration = frames × frameInterval）
│   └── 监听 "pet-reaction" 跨窗口事件
├── PetSprite.tsx → Canvas 渲染
│   └── useSpriteAnimation(canvasRef, state, meta)
│       ├── 加载 spritesheet.png
│       ├── rAF 驱动帧动画
│       ├── scale = displaySize / spriteWidth（动态计算）
│       └── 无图片时渲染 category-based placeholder
└── 交互处理
    ├── 单击 → randomPokeReaction(meta)
    ├── 双击 → triggerState("wave") + toggle_chat_window
    └── 拖拽 → startDragging（3px 阈值判定）
```

### 前端 — Chat 窗口

```
ChatWindow.tsx
├── useAIChat() → { messages, isLoading, sendMessage, provider }
│   ├── 加载 ai-provider.json（fallback 到默认配置）
│   ├── invoke("send_message", { binary, args, envRemove, ... })
│   └── Channel<AIStreamEvent> 处理流式响应
│       ├── textDelta → 追加文本
│       ├── done → 标记完成 + emitTo("pet", "happy")
│       └── error → 显示错误 + emitTo("pet", "confused")
├── ChatMessages.tsx → 消息列表（Markdown 渲染 + 流式光标）
├── ChatInput.tsx → 输入框（Enter 发送 / Shift+Enter 换行）
└── 品牌字符串全部通过 provider.displayName 动态化
```

### Rust 后端

```
commands/
├── ai.rs
│   ├── ALLOWED_BINARIES = ["claude"]     ← 安全 allowlist
│   ├── ALLOWED_CHECK_COMMANDS = ["which", "where"]
│   ├── send_message(prompt, binary, args, env_remove, on_event)
│   │   ├── allowlist 校验
│   │   ├── spawn 进程 + pipe stdout/stderr
│   │   ├── 逐行解析 stream-json（content_block_delta / result）
│   │   ├── Channel 推送 TextDelta/Done/Error
│   │   └── 失败时读取 stderr 拼入错误信息
│   └── check_ai_available(binary, check_command)
│       └── allowlist 校验 + 执行检查
└── window.rs
    ├── set_click_through(ignore)
    └── toggle_chat_window()
        └── 自动定位到 pet 窗口右侧 (x + 320px)
```

## 跨窗口通信

```
Chat Window                          Pet Window
    │                                    │
    │  emitTo("pet", "pet-reaction",     │
    │         { state: "thinking" })      │
    │ ──────────────────────────────────► │
    │                                    │ triggerState("thinking")
    │                                    │ → 播放 thinking 动画
    │  emitTo("pet", "pet-reaction",     │
    │         { state: "happy" })         │
    │ ──────────────────────────────────► │
    │                                    │ triggerState("happy")
    │                                    │ → 播放 happy → 自动回 idle
```

## 状态机流程

```
           ┌──────────────┐
           │  idle-breathe │◄──────────────────────────────┐
           └──────┬───────┘                                │
                  │ 8s                                     │
                  ▼                                        │
           ┌──────────────┐                                │
           │  idle-look    │──── 8s ──► idle-breathe       │
           └──────┬───────┘                                │
                  │ 60s 无操作                              │
                  ▼                                        │
           ┌──────────────┐                                │
           │  idle-sleep   │                               │
           └──────────────┘                                │
                                                           │
  单击 ──► randomPokeReaction ──► happy/angry/lazy/...     │
                                   │ frames×frameInterval  │
                                   └───────────────────────┘
                                                           │
  双击 ──► wave ──────────────── frames×frameInterval ─────┘
                                                           │
  发消息 ─► thinking (loop) ─── done/error ─► happy/confused
                                   │ frames×frameInterval  │
                                   └───────────────────────┘
```

## 数据流

### 消息发送

```
User input
  → useAIChat.sendMessage(text)
    → setMessages([...prev, userMsg, assistantMsg{streaming:true}])
    → emitTo("pet", { state: "thinking" })
    → new Channel<AIStreamEvent>()
    → invoke("send_message", { prompt, binary, args, envRemove, onEvent })
      → [Rust] allowlist check
      → [Rust] spawn process
      → [Rust] readline → parse JSON → Channel.send(TextDelta)
      → [Rust] process exit → Channel.send(Done/Error)
    → onEvent callback → update messages + emit pet reaction
```

## 关键设计决策

### PetState: string vs union literal

`PetState` 设计为 `string` 而非 TypeScript union。牺牲了编译期拼写检查，换来完全的配置驱动：sprite-meta.json 中添加新动画名即可生效。`AnimationCategory` 保留为 union（`"idle" | "sleep" | "poke" | "greet" | "reaction"`），因为 category 是框架级概念，控制行为逻辑，很少变动。

### 安全：Binary Allowlist

前端传入的 `binary` 和 `checkCommand` 在 Rust 端经过 allowlist 验证（`ALLOWED_BINARIES`、`ALLOWED_CHECK_COMMANDS`）。防止 web 上下文被注入后执行任意命令。

### 动画时长自动计算

非循环动画的播放时长 = `frames × frameInterval`，直接从 sprite-meta.json 计算，消除了之前手动维护 `nonLoopDurations` map 的不一致风险。

### Promise 缓存

`loadSpriteMeta()` 缓存的是 Promise 而非结果值，避免并发调用触发多次网络请求。

## 技术栈

| 层 | 技术 |
|----|------|
| 桌面框架 | Tauri v2 |
| 前端 | React 18 + TypeScript + Vite |
| 后端 | Rust + Tokio async |
| 渲染 | HTML5 Canvas (pixelated) |
| AI 集成 | spawn CLI + stream-json + Tauri Channel |
| 状态管理 | React Hooks (useState/useRef/useCallback/useEffect) |
| 路由 | React Router v6 (/pet, /chat) |
| 持久化 | tauri-plugin-store |
| Markdown | react-markdown |
