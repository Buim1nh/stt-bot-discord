// Chạy pipeline bằng tay, không cần bot:
//   npm run stt -- 2026-10-20_2000     (chỉ STT)
//   npm run llm -- 2026-10-20_2000     (chỉ LLM)
//   npm run process                    (cả hai, session mới nhất)
import { resolveSessionDir, runLlm, runStt } from './pipeline.js';

const [mode = 'all', target] = process.argv.slice(2);
const dir = resolveSessionDir(target);
if (!dir) {
  console.error(`Không tìm thấy session "${target ?? '(mới nhất)'}"`);
  process.exit(1);
}
console.log(`Session: ${dir}`);

const progress = (label) => (done, total, note = '') =>
  process.stdout.write(`\r${label} ${done}/${total} ${note}`.padEnd(70));

try {
  if (mode === 'stt' || mode === 'all') {
    const out = await runStt(dir, { onProgress: progress('STT') });
    console.log(`\nTranscript thô: ${out}`);
  }
  if (mode === 'llm' || mode === 'all') {
    const out = await runLlm(dir, { onProgress: progress('LLM') });
    console.log('\nĐầu ra:', out);
  }
} catch (err) {
  console.error(`\nLỗi: ${err.message}`);
  process.exit(1);
}
