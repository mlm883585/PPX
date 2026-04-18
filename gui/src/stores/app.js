/**
 * 应用全局状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import pyApi from '@/api/pywebview'

export const useAppStore = defineStore('app', () => {
  // ========== 状态 ==========

  // 应用信息
  const appName = ref('')
  const appVersion = ref('')

  // 用户信息
  const owner = ref('')

  // 加载状态
  const loading = ref(false)

  // 主题（light / dark）
  const theme = ref('light')

  // ========== 计算属性 ==========

  const isDark = computed(() => theme.value === 'dark')

  const appInfo = computed(() => ({
    appName: appName.value,
    appVersion: appVersion.value
  }))

  // ========== 方法 ==========

  /**
   * 初始化应用信息
   */
  const initAppInfo = async () => {
    try {
      loading.value = true
      const info = await pyApi.system.getAppInfo()
      appName.value = info.appName
      appVersion.value = info.appVersion

      const user = await pyApi.system.getOwner()
      owner.value = user
    } catch (e) {
      console.error('初始化应用信息失败:', e)
    } finally {
      loading.value = false
    }
  }

  /**
   * 切换主题
   */
  const toggleTheme = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
    document.documentElement.classList.toggle('dark', theme.value === 'dark')
  }

  /**
   * 设置主题
   * @param {string} newTheme - 'light' 或 'dark'
   */
  const setTheme = (newTheme) => {
    theme.value = newTheme
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }

  return {
    // 状态
    appName,
    appVersion,
    owner,
    loading,
    theme,

    // 计算属性
    isDark,
    appInfo,

    // 方法
    initAppInfo,
    toggleTheme,
    setTheme
  }
})