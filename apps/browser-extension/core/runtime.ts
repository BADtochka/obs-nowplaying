interface RuntimeApi {
  lastError?: { message?: string }
  sendMessage(message: unknown, callback?: (response: unknown) => void): unknown
}

type ExtensionGlobal = typeof globalThis & {
  browser?: { runtime?: RuntimeApi }
  chrome?: { runtime?: RuntimeApi }
}

/** Firefox exposes browser promises; Chromium also supports the callback API. */
export function sendRuntimeMessage(message: unknown): Promise<unknown> {
  const extension = globalThis as ExtensionGlobal
  const browserRuntime = extension.browser?.runtime
  if (browserRuntime) {
    try {
      return Promise.resolve(browserRuntime.sendMessage(message))
    } catch (error) {
      return Promise.reject(error)
    }
  }

  const runtime = extension.chrome?.runtime
  if (!runtime) return Promise.reject(new Error("Extension runtime unavailable"))

  return new Promise((resolve, reject) => {
    const callback = (response: unknown) => {
      const message = runtime.lastError?.message
      if (message) reject(new Error(message))
      else resolve(response)
    }

    try {
      const response = runtime.sendMessage(message, callback)
      if (response && typeof (response as Promise<unknown>).then === "function") {
        void (response as Promise<unknown>).then(resolve, reject)
      } else if (response !== undefined) {
        resolve(response)
      }
    } catch (error) {
      reject(error)
    }
  })
}
