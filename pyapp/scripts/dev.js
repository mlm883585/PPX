const fs = require('fs')
const net = require('net')
const path = require('path')
const { spawn } = require('child_process')

const rootDir = path.resolve(__dirname, '..', '..')
const mainFile = path.join(rootDir, 'main.py')
const frontendPort = 5173
const useCef = process.argv.includes('--cef')
const isWindows = process.platform === 'win32'
const isMacOS = process.platform === 'darwin'

const watchTargets = [
  mainFile,
  path.join(rootDir, 'api'),
  path.join(rootDir, 'pyapp')
]

const ignoreParts = [
  `${path.sep}.git${path.sep}`,
  `${path.sep}node_modules${path.sep}`,
  `${path.sep}__pycache__${path.sep}`,
  `${path.sep}pyenv${path.sep}`
]

let frontendProcess = null
let appProcess = null
let restartTimer = null
let restarting = false
let shuttingDown = false
let frontendReady = false

function log(message) {
  console.log(`[dev] ${message}`)
}

function getPythonPath() {
  if (isWindows) {
    const envName = useCef ? 'pyenvCEF' : 'pyenv'
    return path.join(rootDir, 'pyapp', 'pyenv', envName, 'Scripts', 'python.exe')
  }

  return path.join(rootDir, 'pyapp', 'pyenv', 'bin', 'python')
}

function runCommand(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
    windowsHide: false,
    detached: !isWindows,
    ...options
  })

  child.on('error', async (error) => {
    if (!shuttingDown) {
      console.error(`[dev] ${command} 启动失败: ${error.message}`)
      await shutdown(1)
    }
  })

  return child
}

function runNpm(args) {
  if (isWindows) {
    return runCommand('cmd.exe', ['/d', '/s', '/c', `npm ${args.join(' ')}`], {
      detached: false
    })
  }

  return runCommand('npm', args)
}

function killProcessTree(pid) {
  return new Promise((resolve) => {
    if (!pid) {
      resolve()
      return
    }

    if (isWindows) {
      const killer = spawn('taskkill', ['/PID', String(pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true
      })

      killer.on('error', () => resolve())
      killer.on('exit', () => resolve())
      return
    }

    try {
      process.kill(-pid, 'SIGTERM')
    } catch (error) {
      try {
        process.kill(pid, 'SIGTERM')
      } catch (_) {
        resolve()
        return
      }
    }

    setTimeout(() => {
      try {
        process.kill(-pid, 'SIGKILL')
      } catch (_) {
      }
      resolve()
    }, 1200)
  })
}

function canConnect(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    socket.setTimeout(1000)

    const done = (success) => {
      socket.destroy()
      resolve(success)
    }

    socket.once('connect', () => done(true))
    socket.once('timeout', () => done(false))
    socket.once('error', () => done(false))
    socket.connect(port, host)
  })
}

async function waitForPort(port, timeout = 30000) {
  const start = Date.now()
  const hosts = ['127.0.0.1', '::1', 'localhost']

  while (!shuttingDown && Date.now() - start < timeout) {
    for (const host of hosts) {
      if (await canConnect(host, port)) {
        return
      }
    }

    await new Promise(resolve => setTimeout(resolve, 500))
  }

  throw new Error(`等待前端服务超时: ${port}`)
}

async function startFrontend() {
  log('启动 Vite 开发服务')
  frontendProcess = runNpm(['run', 'dev', '--prefix', 'gui'])

  frontendProcess.on('exit', async (code) => {
    if (shuttingDown) {
      return
    }

    const exitCode = code ?? 0
    if (!frontendReady || exitCode !== 0) {
      log(`前端服务已退出，结束开发会话 (code=${exitCode})`)
      await shutdown(exitCode)
    }
  })

  await waitForPort(frontendPort)
  frontendReady = true
  log('前端服务已就绪')
}

function buildPythonArgs() {
  const args = [mainFile, '--dev']
  if (useCef) {
    args.push('--cef')
  }
  return args
}

function startApp() {
  const pythonPath = getPythonPath()

  if (!fs.existsSync(pythonPath)) {
    throw new Error(`未找到 Python 解释器: ${pythonPath}`)
  }

  log(`启动桌面应用${useCef ? ' (CEF)' : ''}`)
  appProcess = runCommand(pythonPath, buildPythonArgs())

  appProcess.on('exit', async (code, signal) => {
    const exitCode = code ?? 0

    if (shuttingDown) {
      return
    }

    if (restarting) {
      restarting = false
      startApp()
      return
    }

    log(`桌面应用已退出，结束开发会话 (code=${exitCode}, signal=${signal ?? 'none'})`)
    await shutdown(exitCode)
  })
}

function shouldIgnore(filePath) {
  if (!filePath) {
    return true
  }

  const absolutePath = path.resolve(filePath)
  if (absolutePath !== mainFile && path.extname(absolutePath) !== '.py') {
    return true
  }

  return ignoreParts.some(part => absolutePath.includes(part))
}

function shouldIgnoreDirectory(dirPath) {
  const absolutePath = path.resolve(dirPath)
  return ignoreParts.some(part => absolutePath.includes(part))
}

function scheduleRestart(filePath) {
  if (shuttingDown || restarting || shouldIgnore(filePath)) {
    return
  }

  clearTimeout(restartTimer)
  restartTimer = setTimeout(async () => {
    if (!appProcess || shuttingDown || restarting) {
      return
    }

    restarting = true
    log(`检测到文件变更，重启桌面应用: ${path.relative(rootDir, filePath)}`)
    await killProcessTree(appProcess.pid)
  }, 200)
}

function watchFile(filePath) {
  fs.watch(filePath, () => {
    scheduleRestart(filePath)
  })
}

function watchDirectoryRecursive(targetDir) {
  if (!fs.existsSync(targetDir)) {
    return
  }

  fs.watch(targetDir, (eventType, filename) => {
    if (filename) {
      scheduleRestart(path.join(targetDir, filename))
    }
  })

  for (const entry of fs.readdirSync(targetDir, { withFileTypes: true })) {
    const childPath = path.join(targetDir, entry.name)
    if (entry.isDirectory() && !shouldIgnoreDirectory(childPath)) {
      watchDirectoryRecursive(childPath)
    }
  }
}

function watchDirectory(targetDir) {
  if (!fs.existsSync(targetDir)) {
    return
  }

  if (isWindows || isMacOS) {
    fs.watch(targetDir, { recursive: true }, (eventType, filename) => {
      if (filename) {
        scheduleRestart(path.join(targetDir, filename))
      }
    })
    return
  }

  watchDirectoryRecursive(targetDir)
}

function startWatchers() {
  for (const target of watchTargets) {
    const stat = fs.statSync(target)
    if (stat.isDirectory()) {
      watchDirectory(target)
    } else {
      watchFile(target)
    }
  }
}

async function shutdown(code = 0) {
  if (shuttingDown) {
    return
  }

  shuttingDown = true
  clearTimeout(restartTimer)

  await Promise.all([
    killProcessTree(appProcess && appProcess.pid),
    killProcessTree(frontendProcess && frontendProcess.pid)
  ])

  process.exit(code)
}

async function main() {
  startWatchers()
  await startFrontend()
  startApp()
}

process.on('SIGINT', () => {
  shutdown(0)
})

process.on('SIGTERM', () => {
  shutdown(0)
})

process.on('SIGHUP', () => {
  shutdown(0)
})

main().catch(async (error) => {
  if (error.message !== 'shutdown') {
    console.error(`[dev] ${error.message}`)
  }
  await shutdown(1)
})
