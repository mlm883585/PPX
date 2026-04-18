# PPX

基于 Python + JavaScript 的跨平台桌面客户端应用框架。

## 项目简介

**PPX** 是一个跨平台桌面客户端开发框架：

- **P**ython：后端业务层，处理业务逻辑
- **P**ywebview/Pyinstaller：核心框架，构建桌面应用
- **X**：前端视图层，支持 Vue、React、Angular、HTML 等任意前端框架

适用于需要美观界面、本地计算能力、数据私密性的桌面应用开发场景。

## 核心特性

- 🎨 **灵活的前端** - 支持 Vue、React、Angular、HTML 等任意前端框架
- 🐍 **强大的后端** - 使用 Python 处理业务逻辑，丰富的第三方库支持
- 📦 **一键打包** - 自动构建 macOS、Windows、Linux 平台的安装程序
- 💾 **内置数据库** - 支持 TinyDB（默认）和 SQLite
- 🔄 **热更新** - 开发模式下前端热更新 + Python 监听重启

## 技术栈

| 层级 | 技术栈 |
|------|--------|
| 前端 | Vue 3 + Vite + Element Plus + Sass |
| 后端 | Python 3.8-3.13 |
| 桌面框架 | pywebview 6.1 |
| 打包工具 | PyInstaller 6.17.0 |
| 包管理 | npm（前端） + pip（Python） |
| 数据库 | TinyDB（默认）/ SQLite（可选） |

## 环境要求

- Node.js 16.14+
- Python 3.8-3.13

## 快速开始

### 安装

```bash
git clone https://github.com/pangao1990/PPX.git
cd PPX
npm run init
```

### 开发运行

```bash
npm run start
```

### 打包构建

```bash
# 正式打包
npm run build

# 预打包（带控制台日志，用于调试）
npm run pre
```

### 内网离线迁移

```bash
# 1. 外网执行初始化
npm run init

# 2. 拷贝以下目录到内网
#    - node_modules/
#    - gui/node_modules/
#    - pyapp/pyenv/

# 3. 内网离线初始化
npm run init:offline
```

## 项目结构

```
PPX/
├── main.py              # 主入口文件
├── package.json         # 构建命令配置
├── api/                 # Python 业务层 API
│   ├── api.py           # API 入口类
│   ├── system.py        # 系统 API
│   └── storage.py       # 数据存储 API
├── gui/                 # 前端项目（Vue 3）
│   ├── src/
│   │   ├── api/         # Python API 封装
│   │   ├── assets/      # 静态资源
│   │   ├── components/  # 公共组件
│   │   ├── stores/      # Pinia 状态管理
│   │   ├── styles/      # 样式文件
│   │   ├── App.vue      # 根组件
│   │   └── main.js      # 入口文件
│   ├── vite.config.js   # Vite 配置
│   └── package.json     # 前端依赖
├── pyapp/               # Python 应用配置
│   ├── config/          # 应用配置
│   ├── db/              # 数据库配置
│   ├── icon/            # 应用图标
│   └── package/         # 打包配置
└── static/              # 静态资源
```

## 开发指南

### 前后端通信

#### JavaScript 调用 Python

```python
# api/api.py
class API(System, Storage):
    def system_getAppInfo(self):
        return {'appName': 'PPX', 'appVersion': 'V5.3.5'}
```

```javascript
// 前端调用
window.pywebview.api.system_getAppInfo().then((res) => {
    console.log(res)
})
```

#### Python 调用 JavaScript

```python
# Python 端
window.evaluate_js("jsFunctionName('param')")
```

```javascript
// JavaScript 端
window['jsFunctionName'] = (param) => {
    console.log(param)
}
```

### 配置修改

主要配置位于 `pyapp/config/config.py`：

| 配置项 | 说明 |
|--------|------|
| `appName` | 应用名称 |
| `appVersion` | 版本号 |
| `typeDB` | 数据库类型（`json` 或 `sql`） |
| `appISSID` | Windows 安装包唯一 GUID（首次初始化自动生成，勿修改） |

### 数据库选择

- **TinyDB**（默认）：适用于单数据库文件 < 10M
- **SQLite**：适用于单数据库文件 < 1G

切换方式：修改 `pyapp/config/config.py` 中的 `typeDB` 和 `pyapp/requirements.txt` 中的依赖。

## 前端开发规范

### 样式组织

样式文件位于 `gui/src/styles/` 目录：

| 文件 | 说明 |
|------|------|
| `variables.scss` | SCSS 变量定义（主题色、字体、边框等） |
| `mixins.scss` | SCSS 混入（flex 居中、文字隐藏、滚动条等） |
| `utils.scss` | CSS 工具类（布局、间距、字体大小等） |
| `index.scss` | 入口文件，聚合所有样式 |

**使用方式**：

```scss
// 在组件中使用变量和混入
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.my-component {
  font-family: $--font-family;
  @include flex-center;
}
```

### API 封装

Python API 封装在 `gui/src/api/pywebview.js`，提供统一的异步调用接口：

```javascript
import pyApi from '@/api/pywebview'

// 获取应用信息
const info = await pyApi.system.getAppInfo()

// 获取本机用户名
const owner = await pyApi.system.getOwner()

// 打开文件对话框
const files = await pyApi.system.openFileDialog(['Excel表格 (*.xlsx)'])

// 存储操作
await pyApi.storage.set('key', 'value')
const value = await pyApi.storage.get('key')

// 注册 Python 回调
pyApi.registerCallback('py2js_demo', (data) => {
  console.log('收到 Python 回调:', data)
})
```

### 状态管理

使用 Pinia 进行状态管理，Store 位于 `gui/src/stores/`：

```javascript
import { useAppStore } from '@/stores/app'

// 在组件中使用
const appStore = useAppStore()

// 初始化应用信息
await appStore.initAppInfo()

// 访问状态
console.log(appStore.appName, appStore.appVersion)

// 切换主题
appStore.toggleTheme()
```

### 打包命令

```bash
# 基础命令
npm run build          # 正式打包
npm run pre            # 预打包（带控制台）

# Windows 专用
npm run build:cef      # CEF 兼容模式
npm run build:pure     # 单个 exe 程序
npm run build:folder   # 文件夹模式

# CEF 模式（解决 Windows 白屏问题）
npm run init:cef       # CEF 模式初始化
npm run start:cef      # CEF 模式开发
```

## 注意事项

1. **路径问题**：Windows 下请避免使用中文路径
2. **跨平台打包**：本机只能打包对应系统的安装包，跨平台打包需使用 GitHub Actions
3. **CEF 模式**：Windows 下如遇白屏，可尝试 CEF 兼容模式
4. **数据库**：首次 `npm run init` 前需将 `appISSID` 置空

## 开源协议

本项目采用 [GNU Affero General Public License Version 3 (AGPLv3)](LICENSE) 开源协议。

**原作者：潘高 (pangao1990@qq.com)**

**原项目地址：https://github.com/pangao1990/PPX**

### 协议要点

- ✅ 可以自由使用、学习、修改、分发本软件
- ✅ 修改后的版本必须同样采用 AGPLv3 协议开源
- ✅ 网络服务使用本软件时，必须向用户提供源代码
- ❌ 不能将本软件闭源商业化
- ⚠️ **必须保留原作者版权声明和协议声明**