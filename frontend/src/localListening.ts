import { transcribeRecording } from './api'

export function listenLocally(onLevel: (n: number) => void, onProcessing: () => void,
  onResult: (text: string) => void, onError: (message: string) => void) {
  const controller = new AbortController()
  const ctx = new AudioContext({ sampleRate: 16000 })
  let stream: MediaStream | undefined
  function release() {
    stream?.getTracks().forEach(track => track.stop())
    if (ctx.state !== 'closed') void ctx.close().catch(() => {})
  }
  async function start() {
    await ctx.resume()
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
    if (controller.signal.aborted) return release()
    await ctx.audioWorklet.addModule(import.meta.env.BASE_URL + 'voice-capture.js')
    if (controller.signal.aborted) return
    const node = new AudioWorkletNode(ctx, 'voice-capture')
    node.port.onmessage = async ({ data }) => {
      if (controller.signal.aborted) return
      if (data.recording === undefined) return onLevel(data.level)
      node.port.onmessage = null
      release()
      if (!data.recording.byteLength) return onResult('')
      onProcessing()
      try {
        const text = await transcribeRecording(data.recording, controller.signal)
        if (!controller.signal.aborted) onResult(text)
      } catch (error) {
        if (!controller.signal.aborted) onError(String(error))
      }
    }
    ctx.createMediaStreamSource(stream).connect(node)
    node.connect(ctx.destination)
  }
  void start().catch(error => {
    release()
    if (!controller.signal.aborted) onError(String(error))
  })
  return { abort() { controller.abort(); release() } }
}
