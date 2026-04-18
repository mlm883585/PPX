/**
 * Python API 封装
 * 提供统一的接口调用 Python 后端方法
 */

// 检查 pywebview API 是否可用
const isPywebviewReady = () => {
  return window.pywebview && window.pywebview.api
}

// 等待 pywebview API 就绪
const waitForPywebview = (timeout = 5000) => {
  return new Promise((resolve, reject) => {
    if (isPywebviewReady()) {
      resolve(window.pywebview.api)
      return
    }

    const startTime = Date.now()
    const checkInterval = setInterval(() => {
      if (isPywebviewReady()) {
        clearInterval(checkInterval)
        resolve(window.pywebview.api)
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval)
        reject(new Error('pywebview API 超时未就绪'))
      }
    }, 100)
  })
}

/**
 * 系统相关 API
 */
export const systemApi = {
  /**
   * 获取应用基础信息
   * @returns {Promise<{appName: string, appVersion: string}>}
   */
  getAppInfo: async () => {
    const api = await waitForPywebview()
    return api.system_getAppInfo()
  },

  /**
   * 获取本机用户名
   * @returns {Promise<string>}
   */
  getOwner: async () => {
    const api = await waitForPywebview()
    return api.system_getOwner()
  },

  /**
   * 检查新版本
   * @returns {Promise<{code: number, msg: string, htmlUrl: string, body: string[], downloadUrl: string}>}
   */
  checkNewVersion: async () => {
    const api = await waitForPywebview()
    return api.system_checkNewVersion()
  },

  /**
   * 下载新版本
   * @returns {Promise<boolean>}
   */
  downloadNewVersion: async () => {
    const api = await waitForPywebview()
    return api.system_downloadNewVersion()
  },

  /**
   * 取消下载新版本
   */
  cancelDownloadNewVersion: async () => {
    const api = await waitForPywebview()
    return api.system_cancelDownloadNewVersion()
  },

  /**
   * 用系统默认软件打开文件
   * @param {string} path - 文件路径
   */
  openFile: async (path) => {
    const api = await waitForPywebview()
    return api.system_pyOpenFile(path)
  },

  /**
   * 打开文件选择对话框
   * @param {string[]} fileTypes - 文件类型过滤器，如 ['Excel表格 (*.xlsx;*.xls)']
   * @param {string} directory - 默认目录
   * @returns {Promise<Array<{filename: string, ext: string, dir: string, path: string}>}
   */
  openFileDialog: async (fileTypes = ['全部文件 (*.*)'], directory = '') => {
    const api = await waitForPywebview()
    return api.system_pyCreateFileDialog(fileTypes, directory)
  },

  /**
   * 打开文件夹选择对话框
   * @param {string} directory - 默认目录
   * @returns {Promise<string>} - 选择的文件夹路径
   */
  selectDirDialog: async (directory = '') => {
    const api = await waitForPywebview()
    return api.system_pySelectDirDialog(directory)
  },

  /**
   * Python 调用 JavaScript 函数
   * @param {string} funcName - JS 函数名
   * @param {object} data - 传递的数据
   */
  py2js: async (funcName, data) => {
    const api = await waitForPywebview()
    return api.system_py2js(funcName, data)
  }
}

/**
 * 存储相关 API
 */
export const storageApi = {
  /**
   * 获取存储值
   * @param {string} key - 键名
   * @returns {Promise<any>}
   */
  get: async (key) => {
    const api = await waitForPywebview()
    return api.storage_get(key)
  },

  /**
   * 设置存储值
   * @param {string} key - 键名
   * @param {any} value - 值
   */
  set: async (key, value) => {
    const api = await waitForPywebview()
    return api.storage_set(key, value)
  }
}

/**
 * 注册 JavaScript 函数供 Python 调用
 * @param {string} funcName - 函数名
 * @param {function} callback - 回调函数，接收 JSON 字符串参数
 */
export const registerPyCallback = (funcName, callback) => {
  window[funcName] = (jsonStr) => {
    try {
      const data = JSON.parse(jsonStr)
      callback(data)
    } catch (e) {
      callback(jsonStr)
    }
  }
}

/**
 * 移除已注册的 JavaScript 函数
 * @param {string} funcName - 函数名
 */
export const unregisterPyCallback = (funcName) => {
  delete window[funcName]
}

// 导出统一的 API 对象
export const pyApi = {
  system: systemApi,
  storage: storageApi,
  isReady: isPywebviewReady,
  wait: waitForPywebview,
  registerCallback: registerPyCallback,
  unregisterCallback: unregisterPyCallback
}

// 默认导出
export default pyApi