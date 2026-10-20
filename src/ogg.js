import { Transform } from 'node:stream';

// Bộ ghép (muxer) Ogg Opus tối giản theo RFC 3533 + RFC 7845.
// Nhận từng gói Opus từ @discordjs/voice, xuất file .ogg mà ffmpeg/PyAV đọc được.

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let r = i << 24;
    for (let j = 0; j < 8; j += 1) r = r & 0x80000000 ? (r << 1) ^ 0x04c11db7 : r << 1;
    table[i] = r >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0;
  for (const byte of buf) crc = ((crc << 8) ^ CRC_TABLE[((crc >>> 24) ^ byte) & 0xff]) >>> 0;
  return crc;
}

/** Số mẫu (ở 48 kHz) trong một gói Opus, đọc từ byte TOC. */
function opusSamples(packet) {
  if (!packet.length) return 0;
  const toc = packet[0];
  const cfg = toc >> 3;
  let frameMs;
  if (cfg < 12) frameMs = [10, 20, 40, 60][cfg % 4];
  else if (cfg < 16) frameMs = [10, 20][cfg % 2];
  else frameMs = [2.5, 5, 10, 20][cfg % 4];
  const code = toc & 3;
  const frames = code === 0 ? 1 : code < 3 ? 2 : (packet[1] ?? 0) & 0x3f;
  return frameMs * 48 * frames;
}

export class OggOpusWriter extends Transform {
  constructor({ channels = 2, sampleRate = 48000, packetsPerPage = 10 } = {}) {
    super({ writableObjectMode: true });
    this.serial = (Math.random() * 0xffffffff) >>> 0;
    this.seq = 0;
    this.granule = 0n;
    this.packets = [];
    this.packetsPerPage = packetsPerPage;

    const head = Buffer.alloc(19);
    head.write('OpusHead', 0, 'ascii');
    head[8] = 1; // version
    head[9] = channels;
    head.writeUInt16LE(312, 10); // pre-skip
    head.writeUInt32LE(sampleRate, 12);
    head.writeInt16LE(0, 16); // output gain
    head[18] = 0; // channel mapping family

    const vendor = Buffer.from('stt-bot-discord', 'utf8');
    const tags = Buffer.alloc(8 + 4 + vendor.length + 4);
    tags.write('OpusTags', 0, 'ascii');
    tags.writeUInt32LE(vendor.length, 8);
    vendor.copy(tags, 12);
    tags.writeUInt32LE(0, 12 + vendor.length);

    this.push(this.page([head], 0x02, 0n));
    this.push(this.page([tags], 0x00, 0n));
  }

  page(packets, headerType, granule) {
    const lacing = [];
    for (const p of packets) {
      let len = p.length;
      while (len >= 255) {
        lacing.push(255);
        len -= 255;
      }
      lacing.push(len);
    }
    const header = Buffer.alloc(27 + lacing.length);
    header.write('OggS', 0, 'ascii');
    header[4] = 0;
    header[5] = headerType;
    header.writeBigInt64LE(granule, 6);
    header.writeUInt32LE(this.serial, 14);
    header.writeUInt32LE(this.seq, 18);
    this.seq += 1;
    header[26] = lacing.length;
    Buffer.from(lacing).copy(header, 27);
    const pageBuf = Buffer.concat([header, ...packets]);
    pageBuf.writeUInt32LE(crc32(pageBuf), 22);
    return pageBuf;
  }

  flushPage(headerType = 0) {
    this.push(this.page(this.packets, headerType, this.granule));
    this.packets = [];
  }

  _transform(packet, _enc, done) {
    const buf = Buffer.isBuffer(packet) ? packet : Buffer.from(packet);
    this.granule += BigInt(opusSamples(buf));
    this.packets.push(buf);
    // Mỗi trang tối đa 255 lacing value; 10 gói 20ms ~ 0.2 giây là an toàn
    if (this.packets.length >= this.packetsPerPage) this.flushPage();
    done();
  }

  _flush(done) {
    this.flushPage(0x04); // trang cuối, cờ End Of Stream
    done();
  }
}
