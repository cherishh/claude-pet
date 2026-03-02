# Claude Pet 🦞

像素风龙虾桌面宠物，作为 Claude Code 的可视化前端。

小龙虾平时在桌面安静待着（呼吸、环顾、睡觉等 idle 动画），单击 poke 它会随机做出反应（开心、生气、懒洋洋等），双击弹出对话框通过 Claude Code CLI 进行 AI 对话。对话过程中龙虾会实时反应 — 思考中亮灯泡、收到回复开心跳、出错则困惑转圈。

## 预览

<img src="public/sprites/spritesheet.png" width="512" style="image-rendering: pixelated;" />

## 功能特性

- **像素风龙虾** — 9 种动画状态，每种多帧动画
- **智能交互** — 单击 poke（随机反应）/ 双击打开聊天
- **Claude Code 集成** — 流式输出，逐字显示，Markdown 渲染
- **宠物反应** — 对话状态自动驱动动画切换
- **可拖拽** — 拖动龙虾到桌面任意位置，位置自动持久化
- **系统托盘** — 托盘图标 + 右键菜单（Show Pet / Open Chat / Quit）
- **始终置顶** — 透明窗口，所有桌面空间可见

## 技术栈

| 项目 | 选择 |
|------|------|
| 框架 | Tauri v2 + React + TypeScript |
| 视觉 | 像素风 sprite sheet + Canvas 渲染 (`imageSmoothingEnabled = false`) |
| AI 集成 | spawn `claude` CLI (`--print --output-format stream-json`) + Tauri Channel 流式推送 |
| 平台 | macOS（需要 `macos-private-api` 实现透明窗口） |

## 架构

```
┌─────────────────────────────────────┐
│            Tauri App                │
│                                     │
│  Pet Window          Chat Window    │
│  (透明/置顶)  ◄────  (按需显示)     │
│  Canvas 动画         消息列表+输入   │
│         │    Events    │            │
│  ┌──────┴──────────────┴─────┐      │
│  │       Rust Backend        │      │
│  │  spawn claude CLI         │      │
│  │  stream-json → Channel    │      │
│  │  窗口管理 / 系统托盘       │      │
│  └───────────────────────────┘      │
└─────────────────────────────────────┘
```

## 快速开始

### 前置条件

- [Rust](https://rustup.rs/) (1.70+)
- [Node.js](https://nodejs.org/) (18+)
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) — 需要在 PATH 中可用
- macOS（透明窗口依赖 macOS 私有 API）

### 安装与运行

```bash
# 安装依赖
npm install

# 开发模式
npm run tauri dev

# 打包
npm run tauri build
```

### 重新生成 Spritesheet

```bash
node scripts/generate-spritesheet.cjs
```

## 项目结构

```
desktop-pet/
  public/sprites/
    spritesheet.png       # 像素风龙虾精灵图 (256x288, 32x32 per frame)
    sprite-meta.json      # 帧动画元数据
  scripts/
    generate-spritesheet.cjs  # 纯 Node.js 生成像素龙虾 spritesheet
  src/
    main.tsx              # React Router 入口 (/pet, /chat)
    pet/                  # 宠物窗口
      PetWindow.tsx       # 主组件 (拖拽 + 单击poke + 双击聊天)
      PetSprite.tsx       # Canvas 渲染器
      useSpriteAnimation  # 帧动画 hook (rAF + imageSmoothingEnabled=false)
      useAnimationState   # 状态机 (idle循环/sleep超时/跨窗口事件)
      petAnimations.ts    # 动画定义 + poke反应池
    chat/                 # 聊天窗口
      ChatWindow.tsx      # 主组件 (claude检测 + 关闭按钮)
      ChatInput.tsx       # 输入框 + 发送按钮
      ChatMessages.tsx    # 消息列表 (Markdown渲染 + 流式光标)
      useClaudeChat.ts    # Tauri Channel 流式接收 + 宠物反应事件
    shared/types.ts       # 共享类型
  src-tauri/
    src/
      lib.rs              # Tauri 入口 (插件注册 + 系统托盘)
      commands/
        claude.rs         # spawn claude CLI + stream-json解析 + Channel推送
        window.rs         # 窗口控制 (toggle_chat, set_click_through)
    tauri.conf.json       # 双窗口配置, macOSPrivateApi
```

## 龙虾状态

| 状态 | 触发条件 | 动画效果 |
|------|---------|---------|
| idle-breathe | 默认 | 微微弹跳，钳子跟随 |
| idle-look | 8s 自动切换 | 眼睛左右看，触须摆动 |
| idle-sleep | 60s 无操作 | 闭眼 + Zzz 气泡 |
| wave | 双击宠物 | 右钳挥动打招呼 |
| happy | 单击 poke / 收到回复 | 弹跳 + 星星 + 爱心 |
| angry | 单击 poke | V 形怒眉 + 身体抖动 + 蒸汽 |
| lazy | 单击 poke | 闭眼 + 打哈欠 + 身体下沉 |
| confused | 单击 poke / 出错 | 螺旋眼 + 问号 |
| thinking | 发送消息 | 眼睛转动 + 灯泡亮起 |

## License

MIT
