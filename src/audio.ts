// Web Audio API への出力
//
// APU が生成したサンプルをリングバッファに貯め、
// AudioContext のコールバックが取り出して再生する。
// エミュレータ (requestAnimationFrame) と音声 (オーディオスレッド) は
// 速度が微妙に違うため、バッファで吸収する。

export class AudioOutput {
  private ctx: AudioContext | null = null;
  private node: ScriptProcessorNode | null = null;
  private buffer = new Float32Array(16384);
  private readPos = 0;
  private writePos = 0;
  private lastSample = 0;
  muted = false;

  /** ユーザー操作 (クリック等) の中で呼ぶこと (ブラウザの自動再生制限のため) */
  start(): number {
    if (this.ctx) {
      void this.ctx.resume();
      return this.ctx.sampleRate;
    }
    this.ctx = new AudioContext();
    this.node = this.ctx.createScriptProcessor(2048, 0, 1);
    this.node.onaudioprocess = (e) => {
      const out = e.outputBuffer.getChannelData(0);
      for (let i = 0; i < out.length; i++) {
        if (this.readPos !== this.writePos) {
          this.lastSample = this.buffer[this.readPos];
          this.readPos = (this.readPos + 1) & (this.buffer.length - 1);
        }
        // バッファ切れのときは直前の値を出し続ける (プチノイズ防止)
        out[i] = this.muted ? 0 : this.lastSample;
      }
    };
    this.node.connect(this.ctx.destination);
    return this.ctx.sampleRate;
  }

  /** APU の onSample から呼ばれる */
  push(value: number): void {
    const next = (this.writePos + 1) & (this.buffer.length - 1);
    if (next === this.readPos) return; // バッファ満杯なら捨てる
    this.buffer[this.writePos] = value;
    this.writePos = next;
  }

  /** 溜まっているサンプル数 (速度調整の目安) */
  get queued(): number {
    return (this.writePos - this.readPos) & (this.buffer.length - 1);
  }

  suspend(): void {
    void this.ctx?.suspend();
  }
}
