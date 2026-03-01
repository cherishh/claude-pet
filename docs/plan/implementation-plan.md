# Desktop Pet - Claude Code 桌面宠物 实现计划

## Context

构建一个像素风桌面宠物应用，作为 Claude Code 的可视化前端。宠物平时在桌面安静待着（有呼吸、环顾等 idle 动画），点击后弹出对话框，可以通过 Claude Code CLI 进行 AI 对话。宠物会根据对话状态做出反应（思考中、开心、困惑等）。

## 技术选型

| 项目 | 选择 | 理由 |
|------|------|------|
| 框架 | **Tauri v2 + React + TypeScript** | 体积小（<10MB）、内存低（30-50MB）、已有 Rust 环境 |
| 视觉 | **像素风 sprite sheet + Canvas 渲染** | 经典桌面宠物风格，Canvas 可精确控制 `imageSmoothingEnabled` 保证像素锐利 |
| AI 集成 | **直接 spawn `claude` CLI** | 使用 `claude --print --output-format stream-json`，从 Rust 读取 stdout 逐行解析，通过 Tauri Channel 流式推送到前端 |
| 平台 | **仅 macOS** | 需要 `macos-private-api` feature 实现透明窗口 |

## 架构概览

```
┌─────────────────────────────────────────┐
│              Tauri App                  │
│                                         │
│  ┌──────────────┐  ┌────────────────┐  │
│  │  Pet Window   │  │  Chat Window   │  │
│  │  (透明/置顶/  │  │  (无边框,      │  │
│  │   全屏穿透)   │◄─┤   按需显示)    │  │
│  │              │  │               │  │
│  │  Canvas 渲染  │  │  消息列表      │  │
│  │  sprite 动画  │  │  输入框        │  │
│  └──────┬───────┘  └───────┬───────┘  │
│         │    Tauri Events   │          │
│  ┌──────┴──────────────────┴───────┐  │
│  │         Rust Backend             │  │
│  │  - spawn claude CLI             │  │
│  │  - stream-json 解析              │  │
│  │  - Channel 流式推送              │  │
│  │  - 窗口管理 (显示/隐藏/定位)     │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## 项目结构

```
desktop-pet/
  public/sprites/
    spritesheet.png          # 像素风精灵图
    sprite-meta.json         # 帧动画元数据(行列、帧数、帧间隔)
  src/
    main.tsx                 # React Router: /pet vs /chat
    pet/
      PetWindow.tsx          # 宠物窗口主组件
      PetSprite.tsx          # Canvas sprite 渲染器
      useSpriteAnimation.ts  # 帧动画 hook (requestAnimationFrame)
      useAnimationState.ts   # 状态机: idle/thinking/happy/confused
      petAnimations.ts       # 动画定义(帧数、速度、是否循环)
    chat/
      ChatWindow.tsx         # 聊天窗口主组件
      ChatInput.tsx          # 输入框 + 发送按钮
      ChatMessages.tsx       # 消息列表(支持 streaming)
      useClaudeChat.ts       # Tauri Channel 流式接收 hook
    shared/
      types.ts               # 共享类型定义
  src-tauri/
    src/
      lib.rs                 # Tauri 入口, 注册 commands
      commands/
        claude.rs            # spawn claude CLI, 解析 stream-json, Channel 推送
        window.rs            # 窗口控制: toggle_chat, set_click_through
    tauri.conf.json          # 双窗口配置, macOSPrivateApi
    Cargo.toml               # macos-private-api feature
```

## 实现步骤

### Phase 1: 项目脚手架 + 透明窗口 ✅

1. `npm create tauri-app@latest desktop-pet -- --template react-ts`
2. `Cargo.toml` 添加 `macos-private-api` feature
3. `tauri.conf.json` 配置 pet 窗口: `transparent: true`, `alwaysOnTop: true`, `decorations: false`, 300x300 小窗口
4. 实现 `set_click_through` Rust 命令 — 整个窗口默认穿透，仅 sprite 区域可点击
5. 前端 CSS 设置 `background: transparent`
6. **验证**: 透明窗口正确渲染，点击 sprite 外的区域穿透到桌面

### Phase 2: Sprite 动画系统 ✅

1. 准备占位 spritesheet（drawPlaceholder 彩色圆形 + 表情渲染器）
2. 编写 `sprite-meta.json` 定义动画帧：idle-breathe, idle-look, idle-sleep, thinking, happy, confused, wave
3. 实现 `useSpriteAnimation` hook：Canvas `drawImage` + `requestAnimationFrame` + `imageSmoothingEnabled = false`
4. 实现 `useAnimationState` 状态机：idle 循环切换（8s）、无操作 60s 进入 sleep
5. **验证**: 宠物在屏幕上播放动画，自动循环 idle，超时进入 sleep

### Phase 3: 双窗口 + 点击交互 ✅

1. `tauri.conf.json` 添加 chat 窗口配置（400x600, 默认隐藏）
2. React Router 路由 `/pet` → PetWindow, `/chat` → ChatWindow
3. 实现 `toggle_chat_window` Rust 命令（定位在宠物附近）
4. 搭建 chat UI 骨架: 消息列表 + 输入框 + 发送按钮, 深色主题
5. **验证**: 点击宠物弹出聊天窗口，再次点击关闭

### Phase 4: Claude Code 集成

1. Rust 端实现 `send_to_claude` 命令:
   - `Command::new("claude").args(["--print", "--output-format", "stream-json", &prompt])`
   - BufReader 逐行读 stdout，解析 JSON
   - 通过 Tauri `Channel<ClaudeStreamEvent>` 推送 `textDelta` / `done` / `error`
2. 前端 `useClaudeChat` hook: 创建 Channel, `onmessage` 累积文本并更新消息列表
3. 安装 `react-markdown` 渲染 Claude 的 markdown 回复
4. 启动时检测 `claude` 是否在 PATH 中，不存在则提示
5. **验证**: 输入消息后 Claude 回复逐字流式显示，markdown 正确渲染

### Phase 5: 宠物反应动画

1. 聊天 hook 中通过 `emitTo("pet", "pet-reaction", { state })` 发送事件
2. 发送消息时 → `thinking`（循环动画）
3. 收到回复 → `happy`（非循环，播完回到 idle）
4. 出错 → `confused`（非循环，播完回到 idle）
5. 点击宠物 → `wave`（挥手打招呼）
6. **验证**: 完整对话流程中宠物动画正确切换: wave → thinking → happy

### Phase 6: 打磨

1. 制作/获取正式像素风 spritesheet
2. 宠物可拖拽移动，位置持久化（`tauri-plugin-store`）
3. 系统托盘图标 + 右键菜单（退出/设置）
4. 对话历史持久化
5. 应用图标 + 打包分发

## 关键技术要点

### 透明窗口 + 选择性穿透

- `tauri.conf.json`: `app.macOSPrivateApi: true` (camelCase, 在 `app` 下)
- `Cargo.toml`: `tauri = { version = "2", features = ["macos-private-api"] }`
- ⚠️ 两处配置必须同步，否则构建报错 (#11142)
- 窗口配置: `transparent: true` + `decorations: false` + `alwaysOnTop: true`
- 选择性穿透方案:
  - **方案 A (已采用)**: 小窗口(300x300)代替全屏穿透，前端通过 `set_click_through` 命令切换
  - **方案 B (备选)**: 全屏穿透 + `getCurrentWindow().setIgnoreCursorEvents()`
- CSS 必须设置 `html, body { background: transparent !important; }`

### Claude CLI 流式输出

```rust
// ⚠️ 关键: 必须移除 CLAUDECODE 环境变量，否则 claude 拒绝在嵌套 session 中启动
Command::new("claude")
    .env_remove("CLAUDECODE")
    .args(["--print", "--output-format", "stream-json", &prompt])
    .stdout(Stdio::piped())
    .spawn()
```

stream-json 每行输出一个 JSON 对象，关键类型:
- `content_block_delta` → `delta.text` 增量文本
- `result` → 最终完整结果
- 空行跳过，解析失败忽略

### Tauri Channel 流式推送 (Rust → 前端)

```typescript
// 前端: import { Channel } from '@tauri-apps/api/core'
const onEvent = new Channel<ClaudeStreamEvent>();
onEvent.onmessage = (msg) => { /* 处理增量 */ };
await invoke('send_to_claude', { prompt, onEvent });
```

- `on_event` (Rust) 自动映射为 `onEvent` (JS)
- Channel 保证有序送达，适合高吞吐流式场景

### 跨窗口通信 (Chat → Pet)

- `emitTo("pet", "pet-reaction", payload)` — Tauri Events, 低频广播

## 已知风险与缓解

| 风险 | 缓解方案 |
|------|---------|
| `setIgnoreCursorEvents` macOS 不稳定 (#11461) | 已采用小窗口方案避开 |
| 透明窗口打包 DMG 后失效 (#13415, macOS Sonoma) | 测试 DMG 打包; 必要时用 Cocoa API `setBackgroundColor_` 手动设透明 |
| `claude` CLI 不在 PATH 中 | 启动时 `which claude` 检测，弹提示框引导安装 |
| 嵌套 session 限制 | spawn 时 `.env_remove("CLAUDECODE")` |

## 验证清单

- [x] `cargo check` Rust 编译通过
- [x] `tsc --noEmit` TypeScript 编译通过
- [ ] `cargo tauri dev` 透明窗口正确渲染，无白色/黑色背景
- [ ] 点击穿透: sprite 可点击，sprite 外区域穿透到桌面
- [ ] 像素动画流畅且锐利（Canvas `imageSmoothingEnabled = false`）
- [ ] idle 动画正确循环，超时 60s 进入 sleep
- [ ] 点击宠物弹出/关闭聊天窗口，窗口定位在宠物附近
- [ ] Claude 回复流式显示（逐字输出，非等待全部完成）
- [ ] 宠物反应动画与对话状态同步: wave → thinking → happy/confused
- [ ] `claude` 不可用时弹出友好错误提示
- [ ] 窗口在所有 macOS Spaces/桌面可见 (`visibleOnAllWorkspaces: true`)
- [ ] 应用退出时正确 kill claude 子进程（注册 `CloseRequested` 事件）
- [ ] `cargo tauri build` 打包后透明窗口仍然正常
