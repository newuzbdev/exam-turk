type ExamCue = "start" | "end"

const SILENT_AUDIO_DATA_URL =
  "data:audio/wav;base64,UklGRiUAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQEAAACA"

type WebkitWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext
  }

export class ExamAudioController {
  private context: AudioContext | null = null
  private mediaBuffers = new Map<string, Promise<AudioBuffer>>()
  private activeSources = new Set<AudioScheduledSourceNode>()
  private fallbackAudio: HTMLAudioElement | null = null
  private fallbackPrimed = false
  private finishFallbackPlayback: (() => void) | null = null

  private getContext() {
    if (this.context?.state === "closed") {
      this.context = null
      this.mediaBuffers.clear()
    }
    if (this.context) return this.context

    const AudioContextConstructor =
      window.AudioContext || (window as WebkitWindow).webkitAudioContext
    if (!AudioContextConstructor) {
      throw new Error("AudioContext desteklenmiyor")
    }

    this.context = new AudioContextConstructor()
    return this.context
  }

  isUnlocked() {
    return this.context?.state === "running" || this.fallbackPrimed
  }

  async unlock() {
    return this.unlockFromUserGesture()
  }

  async unlockFromUserGesture() {
    const context = this.getContext()
    const fallbackReady = this.primeFallbackAudioFromUserGesture()

    if (context.state === "suspended") {
      await context.resume()
    }

    const buffer = context.createBuffer(1, 1, context.sampleRate)
    const source = context.createBufferSource()
    source.buffer = buffer
    source.connect(context.destination)
    source.onended = () => source.disconnect()
    source.start(0)

    await fallbackReady
    return this.isUnlocked()
  }

  async playCue(type: ExamCue) {
    await this.unlock()
    const context = this.getContext()

    const tones =
      type === "start"
        ? [
            { frequency: 523.25, offset: 0, duration: 0.16 },
            { frequency: 659.25, offset: 0.12, duration: 0.2 },
          ]
        : [
            { frequency: 659.25, offset: 0, duration: 0.16 },
            { frequency: 493.88, offset: 0.12, duration: 0.22 },
          ]

    const startAt = context.currentTime + 0.015
    await Promise.all(
      tones.map(({ frequency, offset, duration }) =>
        this.playTone(context, frequency, startAt + offset, duration),
      ),
    )
  }

  preloadMedia(url: string) {
    return this.getMediaBuffer(url)
  }

  async playMedia(url: string, volume = 0.6) {
    await this.unlock()
    const buffer = await this.getMediaBuffer(url)
    const context = this.getContext()
    if (context.state === "suspended") {
      await context.resume()
    }

    await new Promise<void>((resolve, reject) => {
      const source = context.createBufferSource()
      const gain = context.createGain()
      source.buffer = buffer
      gain.gain.value = Math.min(1, Math.max(0, volume))
      source.connect(gain)
      gain.connect(context.destination)
      this.activeSources.add(source)

      source.onended = () => {
        this.activeSources.delete(source)
        source.disconnect()
        gain.disconnect()
        resolve()
      }

      try {
        source.start()
      } catch (error) {
        this.activeSources.delete(source)
        reject(error)
      }
    })
  }

  async playHtmlMedia(url: string, volume = 0.6) {
    const audio = this.getFallbackAudio()
    this.stopFallbackPlayback()

    audio.src = url
    audio.currentTime = 0
    audio.muted = false
    audio.volume = Math.min(1, Math.max(0, volume))
    audio.preload = "auto"
    audio.load()

    await new Promise<void>((resolve, reject) => {
      let settled = false
      const finish = (error?: unknown) => {
        if (settled) return
        settled = true
        audio.onended = null
        audio.onerror = null
        if (this.finishFallbackPlayback === stop) {
          this.finishFallbackPlayback = null
        }
        if (error) reject(error)
        else resolve()
      }
      const stop = () => finish()
      this.finishFallbackPlayback = stop
      audio.onended = () => finish()
      audio.onerror = () => finish(new Error("Bölüm sesi oynatılamadı"))
      audio.play().catch((error) => finish(error))
    })
  }

  stopAll() {
    for (const source of this.activeSources) {
      try {
        source.stop()
      } catch {}
    }
    this.activeSources.clear()
    this.stopFallbackPlayback()
  }

  async destroy() {
    this.stopAll()
    this.mediaBuffers.clear()
    if (this.fallbackAudio) {
      this.fallbackAudio.removeAttribute("src")
      this.fallbackAudio.load()
      this.fallbackAudio = null
      this.fallbackPrimed = false
    }
    const context = this.context
    this.context = null
    if (context && context.state !== "closed") {
      try {
        await context.close()
      } catch {}
    }
  }

  private getMediaBuffer(url: string) {
    const cached = this.mediaBuffers.get(url)
    if (cached) return cached

    const pending = (async () => {
      const response = await fetch(url, { credentials: "omit" })
      if (!response.ok) {
        throw new Error(`Ses dosyasi alinamadi (${response.status})`)
      }
      const arrayBuffer = await response.arrayBuffer()
      const context = this.getContext()
      return context.decodeAudioData(arrayBuffer.slice(0))
    })()

    pending.catch(() => {
      if (this.mediaBuffers.get(url) === pending) {
        this.mediaBuffers.delete(url)
      }
    })
    this.mediaBuffers.set(url, pending)
    return pending
  }

  private getFallbackAudio() {
    if (!this.fallbackAudio) {
      this.fallbackAudio = new Audio()
      this.fallbackAudio.setAttribute("playsinline", "")
      this.fallbackAudio.preload = "auto"
    }
    return this.fallbackAudio
  }

  private async primeFallbackAudioFromUserGesture() {
    if (this.fallbackPrimed) return

    const audio = this.getFallbackAudio()
    audio.src = SILENT_AUDIO_DATA_URL
    audio.currentTime = 0
    audio.muted = false
    audio.volume = 0

    try {
      await audio.play()
      audio.pause()
      audio.currentTime = 0
      this.fallbackPrimed = true
    } catch {
      // Web Audio remains the primary player. A later explicit gesture can retry.
    }
  }

  private stopFallbackPlayback() {
    const finish = this.finishFallbackPlayback
    this.finishFallbackPlayback = null
    if (this.fallbackAudio) {
      this.fallbackAudio.pause()
      this.fallbackAudio.currentTime = 0
    }
    finish?.()
  }

  private playTone(
    context: AudioContext,
    frequency: number,
    startsAt: number,
    duration: number,
  ) {
    return new Promise<void>((resolve) => {
      const oscillator = context.createOscillator()
      const harmonic = context.createOscillator()
      const gain = context.createGain()
      const harmonicGain = context.createGain()
      const endsAt = startsAt + duration

      oscillator.type = "sine"
      oscillator.frequency.setValueAtTime(frequency, startsAt)
      harmonic.type = "triangle"
      harmonic.frequency.setValueAtTime(frequency * 2, startsAt)

      gain.gain.setValueAtTime(0.0001, startsAt)
      gain.gain.exponentialRampToValueAtTime(0.18, startsAt + 0.018)
      gain.gain.exponentialRampToValueAtTime(0.0001, endsAt)
      harmonicGain.gain.setValueAtTime(0.0001, startsAt)
      harmonicGain.gain.exponentialRampToValueAtTime(0.035, startsAt + 0.018)
      harmonicGain.gain.exponentialRampToValueAtTime(0.0001, endsAt)

      oscillator.connect(gain)
      harmonic.connect(harmonicGain)
      gain.connect(context.destination)
      harmonicGain.connect(context.destination)
      this.activeSources.add(oscillator)
      this.activeSources.add(harmonic)

      let endedCount = 0
      const handleEnded = () => {
        endedCount += 1
        if (endedCount < 2) return
        this.activeSources.delete(oscillator)
        this.activeSources.delete(harmonic)
        oscillator.disconnect()
        harmonic.disconnect()
        gain.disconnect()
        harmonicGain.disconnect()
        resolve()
      }
      oscillator.onended = handleEnded
      harmonic.onended = handleEnded
      oscillator.start(startsAt)
      harmonic.start(startsAt)
      oscillator.stop(endsAt)
      harmonic.stop(endsAt)
    })
  }
}

let sharedExamAudioController: ExamAudioController | null = null

export const getSharedExamAudioController = () => {
  if (!sharedExamAudioController) {
    sharedExamAudioController = new ExamAudioController()
  }
  return sharedExamAudioController
}

export const destroySharedExamAudioController = async () => {
  const controller = sharedExamAudioController
  sharedExamAudioController = null
  await controller?.destroy()
}
