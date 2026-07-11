import { useCallback, useEffect, useRef, useState } from 'react'

type InstallChoice = { outcome: 'accepted' | 'dismissed'; platform: string }

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<InstallChoice>
}

type NavigatorWithStandalone = Navigator & { standalone?: boolean }

export type PwaLifecycle = {
  online: boolean
  installed: boolean
  installAvailable: boolean
  updateReady: boolean
  requestInstall: () => Promise<boolean>
  applyUpdate: () => void
}

export function isStandaloneMode() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    Boolean((navigator as NavigatorWithStandalone).standalone)
  )
}

export function usePwaLifecycle(): PwaLifecycle {
  const [online, setOnline] = useState(() => navigator.onLine)
  const [installed, setInstalled] = useState(isStandaloneMode)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)
  const reloadForUpdate = useRef(false)

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    const handleInstalled = () => {
      setInstalled(true)
      setInstallPrompt(null)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)

    let registration: ServiceWorkerRegistration | undefined
    const handleControllerChange = () => {
      if (reloadForUpdate.current) window.location.reload()
    }
    const inspectInstallingWorker = () => {
      const worker = registration?.installing
      if (!worker) return
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          setWaitingWorker(registration?.waiting ?? worker)
        }
      })
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
      navigator.serviceWorker
        .register('/sw.js')
        .then((nextRegistration) => {
          registration = nextRegistration
          if (registration.waiting) setWaitingWorker(registration.waiting)
          registration.addEventListener('updatefound', inspectInstallingWorker)
          void registration.update()
        })
        .catch(() => undefined)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
      navigator.serviceWorker?.removeEventListener('controllerchange', handleControllerChange)
      registration?.removeEventListener('updatefound', inspectInstallingWorker)
    }
  }, [])

  const requestInstall = useCallback(async () => {
    if (!installPrompt) return false
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    setInstallPrompt(null)
    return choice.outcome === 'accepted'
  }, [installPrompt])

  const applyUpdate = useCallback(() => {
    if (!waitingWorker) return
    reloadForUpdate.current = true
    waitingWorker.postMessage({ type: 'SKIP_WAITING' })
  }, [waitingWorker])

  return {
    online,
    installed,
    installAvailable: Boolean(installPrompt) && !installed,
    updateReady: Boolean(waitingWorker),
    requestInstall,
    applyUpdate,
  }
}
