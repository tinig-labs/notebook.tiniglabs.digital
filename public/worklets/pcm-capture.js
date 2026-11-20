// Copies mono PCM frames from the mic to the main thread, with an RMS level for the meter.
class PcmCapture extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch && ch.length) {
      let sum = 0;
      for (let i = 0; i < ch.length; i++) sum += ch[i] * ch[i];
      const copy = new Float32Array(ch);
      this.port.postMessage({ pcm: copy, rms: Math.sqrt(sum / ch.length) }, [copy.buffer]);
    }
    return true;
  }
}
registerProcessor("pcm-capture", PcmCapture);
