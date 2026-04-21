---
title: 谈谈我认为的"Electron为什么都喜欢用"
date: 2026-04-21
tags:
  - Electron
  - 跨端开发
  - 碎碎念
categories: 随笔
---

## 前言

最近跟朋友聊了一波跨端开发框架的选型问题，聊着聊着发现大家对 Electron 的理解还是有不少误区。正好看到 Electron 维护者 Felix Rieseberg 写的 [Things people get wrong about Electron](https://felixrieseberg.com/things-people-get-wrong-about-electron/)，结合自己的经验，整理一下我的看法。

## Electron：大厂为什么爱用它

很多人觉得大厂用 Electron 是因为"前端多、招人便宜"。太表面了。

**核心原因是：UI 表现稳定，且与 web 端一致。**

大厂通常有 web 端和桌面端，用 Electron 做桌面端，UI 层代码高度复用，渲染结果一致。这不是"偷懒"，这是**工程效率**。

体积大？Netflix 一小时 7GB，游戏更新动辄 300GB。100-300MB 的安装包对大厂来说根本不是事。**不差这点流量和带宽。**

### Electron 不是万能的

**一旦涉及到原生能力，Electron 作者本身也建议你用 C++、Objective-C 或 Rust 来写。**

Felix Rieseberg 原话：

> Electron 的核心理念在于，你可以将 Web 应用与任何你想要编写的原生代码配对——具体来说是 C++、Objective-C 或 Rust。

1Password 大部分核心代码完全用 Rust 编写，UI 层才交给 Electron。

**Electron 的正确打开方式：HTML 负责 UI，原生代码负责重活。**

## Flutter：最完美但最难用

**Flutter 是最完美的跨端类原生方案。** 性能、UI 稳定性、平台兼容性三项满分。自绘引擎，像素级一致，全平台覆盖。

**代价是 Dart 反人类。** 比 Kotlin 难用得多，某些地方比 Rust 都麻烦。生态跟 JavaScript/TypeScript 比差太远。

**最好的方案，但不是最实用的方案。**

## WebView 方案：本质上是不稳的

WebView 方案（比如 [Tauri](https://tauri.app/)、[Electrobun](https://blackboard.sh/blog/electrobun-v1/) 这类）的思路是不自带浏览器内核，用系统 WebView 渲染 UI。体积小、启动快，听起来很美好。

**但这是个复杂的决策。**

做网站时，三平台 UI 表现差异可以忽略不计。但做客户端没办法——用户的 WebView 环境可能缺失，可能版本老旧，可能有 bug。

**Safari 某些版本有 bug，做 web 的都知道，这是常态。** CSS 的、JS 的、渲染的，各种姿势。macOS 上用 WebView 方案底层就是 WebKit，这些 bug 你都得吃下来。Windows 上 WebView2 好一些，但版本不受你控制。

Felix Rieseberg 也提到了，当年 Slack 用 macOS 原生 WebView（MacGap）的时候，性能反而不如 Chrome，后来切到 Electron 才稳定。

**所以 Electron 自带 Chromium 不是为了"大"而大，而是环境可控。** 打包时确定浏览器版本，测试过的就是用户跑的版本。WebView 方案本质上是把环境风险转嫁给了用户。

## 总结

| 维度       | Electron            | Flutter        | WebView 方案           |
| ---------- | ------------------- | -------------- | ---------------------- |
| UI 稳定性  | 高（自带 Chromium） | 高（自绘引擎） | 不确定（依赖用户环境） |
| 性能       | 中等                | 高             | 中等                   |
| 开发体验   | 好（Web 技术栈）    | 差（Dart）     | 好（Web 技术栈）       |
| 包体积     | 大                  | 中等           | 小                     |
| 环境可控性 | 高                  | 高             | 低                     |
| 原生能力   | C++/ObjC/Rust 桥接  | 原生支持       | 受限                   |

**Electron 不是最好的跨端方案，但它是大厂场景下最务实的选择。**

体积大不是缺点，是你为稳定性付出的代价。需要原生能力就用 C++/Objective-C/Rust 写原生模块。Flutter 技术上更优雅但 Dart 是硬伤。WebView 方案体积小但环境不可控。

**技术选型没有银弹，只有 trade-off。**
