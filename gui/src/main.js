import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)

// 状态管理 Pinia
import pinia from '@/stores'
app.use(pinia)

// 组件库 ElementPlus
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css' // 暗黑模式
app.use(ElementPlus)

// 图标库 ElementPlus
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(`ele-${key}`, component)
}

// 自定义图标库
import SvgIcon from '@/components/SvgIcon/index.vue'
app.component('SvgIcon', SvgIcon)

// 自定义样式
import '@/styles/index.scss'

// 全局导出 Python API（可选，便于直接使用）
import pyApi from '@/api/pywebview'
window.$pyApi = pyApi

app.mount('#app')