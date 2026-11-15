# 🐷 糯糯学伴 Mochi Planner

一款可爱的粉色小猪学习管理 APP：课程表、日历、作业、考试、番茄钟、待办、笔记与学习统计，支持简体中文 / English 即时切换，适配安卓手机与平板。

A cute pink-pig study planner for students — timetable, calendar, assignments, exams, pomodoro, to-dos, notes and stats, in Simplified Chinese and English, for Android phones and tablets.

---

## 📥 下载安装 APP（推荐）

1. 打开本仓库的 **Releases** 页面（右侧栏 → Releases，或 `https://github.com/<你的用户名>/mochi-planner/releases/latest`）。
2. 在安卓手机/平板上下载最新的 `MochiPlanner-v0.1.x.apk`。
3. 打开 APK，按提示允许「安装未知来源应用」，点击安装。
4. 以后有新版本，直接下载安装即可覆盖更新，资料会保留。

> 每次把代码推送到 `main` 分支，GitHub Actions 会自动构建 APK 并发布到 Releases（约 5–8 分钟）。也可以在 **Actions → Build Android APK → Run workflow** 手动触发。

## 🚀 第一次上传到 GitHub

**方法 A：命令行**
```bash
cd mochi-planner
git remote add origin https://github.com/<你的用户名>/mochi-planner.git
git branch -M main
git push -u origin main
```
**方法 B：GitHub Desktop** — File → Add local repository → 选择 `mochi-planner` 文件夹 → Publish repository。

推送后到 **Actions** 页面查看构建进度；完成后在 **Releases** 下载 APK。
如果 Actions 提示没有权限创建 Release：仓库 **Settings → Actions → General → Workflow permissions** 选择 **Read and write permissions**。

上传后建议修改 `www/js/config.js` 里的 `repoUrl`（和可选的 `contactEmail`），让 APP 里的「联系开发者 / 报告错误」指向你的仓库。

## ✨ 功能（v0.1）

| 模块 | 功能 |
|---|---|
| 首页 | 日期星期、小猪状态与鼓励语、下一堂课倒计时、今日课程、待交作业、考试倒计时、今日专注、待办；可调整排序与显示 |
| 课表 / 日历 | 日/周/月视图、每周重复、开始/结束日期、冲突提醒、自定义提醒时间、颜色；**图片 OCR 导入**（识别后先核对再导入）；**语音录入** |
| 作业 | 课程、标题、截止日期时间、说明、备注、照片/文件附件；**子任务步骤**，🔴未开始 🟡进行中 🟢已完成 自动状态；按截止日期排序；逾期/即将截止高亮 |
| 考试 | 倒计时、温习目标（小时）、温习计划（可一键生成）、按科目统计温习时间、考前多次提醒 |
| 番茄钟 | 自定义专注/短休/长休、开始/暂停/继续/结束/跳过；小猪陪读动画；金币奖励；累计专注解锁 8 种装饰 + 6 种表情；每日目标、连续记录 |
| 待办 | 优先级、截止日期、快速添加、清除已完成 |
| 笔记与文件 | 拍照/相册/文件上传、按课程与分类管理、搜索 |
| 统计 | 日/周/月专注柱状图、作业完成率、连续记录、按科目分布、学习习惯分析 |
| 搜索 | 课程、作业、考试、笔记、待办全局搜索；按类型、课程代码、日期筛选 |
| 设置 | 语言、账号资料、通知（分类开关/默认时间/声音/勿扰时段/测试）、外观（浅色/深色/跟随系统、5 种主题色、字号、首页布局、小猪外观）、日历（周起始日/默认视图/12-24 小时/日期格式）、备份（自动快照/立即备份/恢复/导出/导入/储存空间/文件管理）、隐私（4 位密码锁/离开自动上锁）、声音震动、帮助（指南/FAQ/反馈/报告错误）、关于 |

## 🗺️ 路线图

- **v0.2** — Firebase：Google 登录、Email 注册/登录、云端备份、自动同步、换设备恢复、修改密码、删除云端账号。
- **v0.3** — 好友：邀请码/链接连接、课表共享与权限、一键「该上课啦！」提醒、文字/语音讯息、照片、语音通话（WebRTC）、消息推送（FCM）。

详见 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)。

## 🛠️ 开发

```bash
npm run serve              # 浏览器预览：http://localhost:8080
npm run check              # 检查中英文翻译是否完整
npm install                # 安装 Capacitor（需要网络）
npm run android:add        # 生成 android/ 工程
npm run android:sync       # 同步网页代码到 android/
npm run android:open       # 用 Android Studio 打开
```

- 网页代码在 `www/`（原生 ES Modules，无需构建步骤）。
- 新增界面文字时，同时在 `www/js/lang.js` 的 `zh` 和 `en` 中加入同一个 key；CI 会运行 `scripts/check-i18n.mjs`，缺少翻译会构建失败。
- `keystore/debug.keystore` 是用于侧载安装的签名，保证每次构建的 APK 都能覆盖安装。若要上架 Google Play，请改用你自己的正式签名并放进 GitHub Secrets。

## 📄 许可

MIT。吉祥物「糯糯」为本项目原创设计。OCR 使用 Tesseract.js（Apache-2.0）。
