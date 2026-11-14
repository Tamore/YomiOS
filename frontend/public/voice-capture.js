class VoiceCapture extends AudioWorkletProcessor {
  constructor() {
    super()
    this.elapsed = 0
    this.lastSpeech = 0
    this.blocks = []
  }
  process(inputs) {
    const samples = inputs[0]?.[0]
    if (!samples?.length) return true
    this.elapsed += samples.length
    let power = 0
    const pcm = new Int16Array(samples.length)
    for (let i = 0; i < samples.length; i++) {
      power += samples[i] ** 2
      pcm[i] = Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767)
    }
    this.blocks.push(pcm)
    const rms = Math.sqrt(power / samples.length)
    if (rms > 0.014) this.lastSpeech = this.elapsed
    if (this.blocks.length % 8 === 0) this.port.postMessage({ level: Math.min(1, rms * 6) })
    if (this.elapsed >= sampleRate * 30 ||
        (this.lastSpeech ? this.elapsed - this.lastSpeech > sampleRate : this.elapsed > sampleRate * 8)) {
      const result = new Int16Array(this.lastSpeech ? this.elapsed : 0)
      if (this.lastSpeech) {
        let offset = 0
        for (const block of this.blocks) { result.set(block, offset); offset += block.length }
      }
      this.port.postMessage({ recording: result.buffer }, [result.buffer])
      return false
    }
    return true
  }
}
registerProcessor('voice-capture', VoiceCapture)
