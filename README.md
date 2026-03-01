# Claude Pet 🐾

像素风桌面宠物，作为 Claude Code 的可视化前端。

宠物平时在桌面安静待着（呼吸、环顾、睡觉等 idle 动画），点击后弹出对话框，通过 Claude Code CLI 进行 AI 对话。宠物会根据对话状态做出反应 — 思考中转圈、收到回复开心、出错困惑。

## 预览

> 开发中，目前使用占位动画（彩色圆形 + 表情），后续替换为像素风 spritesheet。

## 技术栈

| 项目 | 选择 |
|------|------|
| 框架 | Tauri v2 + React + TypeScript |
| 视觉 | 像素风 sprite sheet + Canvas 渲染 |
| AI 集成 | spawn `claude` CLI (`--print --output-format stream-json`) |
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
│  │  窗口管理                  │      │
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

## 项目结构

```
desktop-pet/
  public/sprites/         # sprite 资源
  src/
    main.tsx              # React Router 入口
    pet/                  # 宠物窗口
      PetWindow.tsx       # 主组件 (点击穿透 + 交互)
      PetSprite.tsx       # Canvas 渲染器
      useSpriteAnimation  # 帧动画 hook
      useAnimationState   # 状态机 (idle/thinking/happy/...)
    chat/                 # 聊天窗口
      ChatWindow.tsx      # 主组件
      ChatInput.tsx       # 输入框
      ChatMessages.tsx    # 消息列表 (支持流式)
    shared/types.ts       # 共享类型
  src-tauri/
    src/
      lib.rs              # Tauri 入口
      commands/
        claude.rs         # Claude CLI 集成
        window.rs         # 窗口控制
    tauri.conf.json       # 双窗口配置
```

## 宠物状态

| 状态 | 触发条件 | 动画 |
|------|---------|------|
| idle-breathe | 默认 | 循环呼吸 |
| idle-look | 8s 自动切换 | 左右看 |
| idle-sleep | 60s 无操作 | 闭眼 Zzz |
| wave | 点击宠物 | 挥手 |
| thinking | 发送消息 | 转圈思考 |
| happy | 收到回复 | 开心跳动 |
| confused | 出错 | 困惑表情 |

## License

MIT
