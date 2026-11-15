# 糯糯学伴 Mochi Planner — 架构与技术方案 / Architecture

## 1. 技术方案 (Tech stack)

| 层 Layer | 选择 Choice | 原因 Why |
|---|---|---|
| UI | 原生 HTML/CSS/ES Modules（无构建步骤） | 轻量、启动快、调试简单，手机/平板响应式 |
| 安卓壳 Android shell | **Capacitor 6** | 把 Web 应用打包成真正的 APK，可调用原生通知、语音、文件、分享、震动 |
| 本地数据库 Local DB | **IndexedDB**（`mochi-db`：`kv` / `files` / `backups`） | 离线可用，存储照片和文件 Blob |
| 通知 Notifications | `@capacitor/local-notifications`（浏览器中回退到 Web Notification） | 课程/作业/考试/温习/番茄钟提醒，支持勿扰时段和自定义声音频道 |
| 语音 Voice | `@capacitor-community/speech-recognition`（浏览器回退 Web Speech API） | 语音录入课程、作业、考试 |
| OCR | **Tesseract.js**（首次使用时联网下载，中英文模型） | 课程表图片识别 → 人工核对 → 导入 |
| 文件导出 Export | `@capacitor/filesystem` + `@capacitor/share` | 备份导出、附件打开 |
| CI/CD | **GitHub Actions** → 自动构建并发布 APK 到 Releases | 「在 GitHub 直接下载 APP」 |
| 云端（第 2 阶段） | Firebase Auth（Google + Email）、Firestore、Storage | 账号、云备份、跨设备同步 |
| 实时通讯（第 3 阶段） | Firestore 实时监听 + FCM 推送 + WebRTC 语音通话 | 好友、聊天、语音讯息、通话、上课提醒按钮 |

## 2. 页面结构与导航 (Pages & navigation)

```
启动 → 引导页(3 张) → [PIN 锁] → 主界面
主界面底部导航（平板为左侧导航栏）:
├── 首页 Home ─ 日期/小猪状态/下一堂课倒计时/今日课程/待交作业/考试倒计时/今日专注/待办（可自定义布局）
├── 课表 Schedule ─ 日/周/月视图 · 内置日历 · 添加课程(手动/图片OCR/语音) · 冲突提醒
├── ＋ 快速添加 ─ 课程 / 作业 / 考试 / 待办 / 笔记 / 语音
├── 任务 Tasks ─ 作业(子任务+红黄绿状态) · 考试(倒计时+温习计划) · 待办(优先级)
├── 专注 Focus ─ 番茄钟 · 小猪伙伴动画 · 奖励 · 每日目标 · 连续记录
└── 我的 Me ─ 学习统计 · 笔记与文件 · 小猪衣橱 · 搜索 · 数据备份 · 设置 · 帮助 · 关于
设置 Settings: 语言 / 账号资料 / 通知 / 外观 / 日历课表 / 备份数据 / 隐私安全 / 声音震动 / 帮助 / 关于
```

## 3. 数据结构 (Data model)

```
state
├── profile      {name, avatar, email, createdAt}
├── settings     {lang, appearance, notif, cal, sound, focus, backup, security, home, pig}
├── courses[]    {id, name, code, start, end, location, lecturer, startDate, endDate, days[], color, remind}
├── assignments[]{id, course, title, dueDate, dueTime, desc, notes, subtasks[{id,title,done}], done, files[], remind}
├── exams[]      {id, course, date, time, location, notes, remindDays[], goalHours, plan[{id,title,date,done}]}
├── todos[]      {id, title, priority, due, done}
├── notes[]      {id, title, body, course, category, files[]}
├── focusLog[]   {id, start, minutes, label}
├── timer        {mode, running, endAt, remainingMs, totalMs, cycle, label}
└── rewards      {coins, unlocked[]}
files (IndexedDB) {id, name, type, size, blob}  ← 被作业/笔记通过 id 引用
```

关系：作业、考试、笔记通过 `course`（课程代码或名称）关联课程；附件通过 `files[]` 引用 `files` 表；专注记录可带 `label`（课程/作业）。

## 4. 开发阶段 (Roadmap)

- **v0.1（本次）**：完整 UI/UX、课程表+日历、OCR/语音录入、作业、考试、番茄钟、待办、笔记文件、统计、搜索、完整设置、中英文即时切换、本地通知、PIN 锁、本地自动备份/导出/恢复、APK 自动构建。
- **v0.2**：Firebase 账号（Google + Email）、云备份、自动同步、多设备恢复、账号管理（改密码/删除账号）。
- **v0.3**：好友连接（邀请码/链接）、课表共享与权限、一键上课提醒、文字/语音讯息/照片聊天、语音通话、隐私权限管理。

## 5. 目录 (Repository layout)

```
www/                 Web 应用（即 APP 内容）
  index.html
  css/app.css
  js/app.js          路由、弹窗、事件、启动
  js/store.js        IndexedDB 数据层、备份
  js/i18n.js         简体中文 / English 字典
  js/utils.js        日期时间工具
  js/pig.js          原创小猪 SVG（表情、装饰、动画）
  js/native.js       Capacitor 插件桥接（通知、语音、文件、震动）
  js/parse.js        语音/OCR 文本解析
  js/views/*.js      各页面
  assets/            图标、声音
android-res/         APP 图标、通知声音（CI 中复制进 Android 工程）
scripts/patch-android.js  CI 中修补 Android 工程（权限、图标、版本）
.github/workflows/android.yml  构建 APK 并发布到 Releases
```
