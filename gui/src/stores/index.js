/**
 * Pinia Store 入口文件
 */

import { createPinia } from 'pinia'

const pinia = createPinia()

export default pinia

// 导出所有 store
export * from './app'