/**
 * Converts Float32Array audio samples to WAV format buffer
 */
export function convertFloat32ToWav(
  samples: number[],
  sampleRate: number,
): Buffer {
  const length = samples.length;
  const buffer = Buffer.alloc(44 + length * 2); // WAV header is 44 bytes

  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      buffer.writeUInt8(string.charCodeAt(i), offset + i);
    }
  };

  // ChunkID "RIFF"
  writeString(0, "RIFF");
  // ChunkSize
  buffer.writeUInt32LE(36 + length * 2, 4);
  // Format "WAVE"
  writeString(8, "WAVE");
  // Subchunk1ID "fmt "
  writeString(12, "fmt ");
  // Subchunk1Size (16 for PCM)
  buffer.writeUInt32LE(16, 16);
  // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(1, 20);
  // NumChannels (1 for mono)
  buffer.writeUInt16LE(1, 22);
  // SampleRate
  buffer.writeUInt32LE(sampleRate, 24);
  // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  buffer.writeUInt32LE(sampleRate * 2, 28);
  // BlockAlign (NumChannels * BitsPerSample/8)
  buffer.writeUInt16LE(2, 32);
  // BitsPerSample
  buffer.writeUInt16LE(16, 34);
  // Subchunk2ID "data"
  writeString(36, "data");
  // Subchunk2Size
  buffer.writeUInt32LE(length * 2, 40);

  // Convert float samples to 16-bit PCM
  let offset = 44;
  for (let i = 0; i < length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i] ?? 0));
    const int16 = Math.floor(sample * 32767);
    buffer.writeInt16LE(int16, offset);
    offset += 2;
  }

  return buffer;
}
