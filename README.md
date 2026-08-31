# Jeff 提词器 · Jeff Teleprompter

> 一款 **Windows 桌面提词器**,帮助口播 / 视频创作者在录制时流畅读稿。把写好的文案拖进去就能用,黑底白字自动滚动,当前句始终居中放大。
>
> A **Windows desktop teleprompter** for content creators. Drag in your script and it scrolls automatically — the current line stays centered and maximized.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## ✨ 功能特性

- **拖拽即用** — 把文案文件直接拖进窗口,或点击「打开文件」选择
- **多格式支持** — TXT(记事本)、Markdown、Word(.docx / .doc)、富文本(.rtf)
- **中文友好** — 自动识别 UTF-8 与 GBK 编码,中文 Windows 记事本文件拖进去不乱码
- **智能滚动** — 黑底白字向上滚动;当前句居中、字号最大、纯白;下一句由浅变深、逐渐放大;已读句上移变暗
- **速度可调** — 右侧 ＋/− 调节,80–500 字/分钟,默认 250,步进 10
- **键盘控制** — `空格` 开始/暂停、`↑` 上一句、`↓` 下一句、`F11` 全屏
- **一键退出** — 左上角「← 退出」回到选文件界面

## 🚀 快速开始

### 运行(开发模式)

```bash
npm install   # 安装依赖
npm start     # 启动应用
```

### 打包成 exe

```bash
npm run dist
```

打包产物输出到 `release/` 目录,双击即可运行。

### 运行测试

```bash
npm test
```

## 🧭 使用说明

1. 启动后,把 `.txt` / `.md` / `.docx` / `.doc` / `.rtf` 文件拖进窗口(或点「打开文件」)。
2. 文案自动向上滚动,`空格` 开始/暂停,`↑` / `↓` 切换句子。
3. 右侧 ＋/− 调整滚动速度;`F11` 全屏;左上角「← 退出」返回选文件界面。

## 🛠 技术栈

- [Electron](https://www.electronjs.org/) — 桌面应用框架
- 文档解析:`mammoth`(.docx)、`word-extractor`(.doc)、自研解析(.rtf)
- 编码兼容:`iconv-lite`(UTF-8 / GBK)
- 打包:`electron-builder`
- 测试:`jest` + `jest-environment-jsdom`

## 📁 目录结构

```
jeff-teleprompter/
├── main.js          # Electron 主进程
├── preload.js       # 预加载脚本
├── src/
│   ├── app.js       # 前端逻辑(滚动引擎 / 速度 / 键盘)
│   ├── parse.js     # 文案解析(编码识别 / 断句)
│   ├── index.html   # 界面
│   └── style.css    # 样式
├── tests/           # 单元测试
├── docs/            # 产品文档
└── package.json
```

## 🗺 路线图

- [ ] 镜像模式(配合提词镜 / 分光镜使用)
- [ ] 字号大小调节
- [ ] 断点 / 书签 / 续读
- [ ] 朗读计时(预估总时长)
- [ ] 导入 PDF、WPS

## 📄 开源协议

本项目采用 [MIT](LICENSE) 协议开源,任何人可自由使用、修改、分发(包括商用),只需保留版权声明。
