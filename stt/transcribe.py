"""Chuyển audio của một session thành transcript thô bằng faster-whisper.

Cách dùng:  python stt/transcribe.py sessions/2026-10-20_2000

Đầu ra trong thư mục session:
  transcripts.jsonl   kết quả từng đoạn (cache, chạy lại sẽ bỏ qua đoạn đã xong)
  transcript_raw.md   transcript theo dòng thời gian, mỗi dòng một lượt nói
In ra stdout các dòng "PROGRESS i/n" để bot hiển thị tiến độ.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Câu Whisper hay "bịa" ra khi gặp tiếng ồn / im lặng (học từ video YouTube tiếng Việt)
HALLUCINATIONS = [
    r"hãy subscribe",
    r"đăng ký kênh",
    r"cảm ơn các bạn đã (theo dõi|xem)",
    r"ghiền mì gõ",
    r"like và share",
    r"bấm chuông",
    r"phụ đề (bởi|được)",
    r"subtitles? by",
    r"thanks for watching",
]
HALLUCINATION_RE = re.compile("|".join(HALLUCINATIONS), re.IGNORECASE)


def load_env() -> dict[str, str]:
    env = dict(os.environ)
    env_file = ROOT / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            env.setdefault(key.strip(), value.strip())
    return env


def setup_cuda_dlls() -> None:
    """Gói pip nvidia-cublas-cu12 / nvidia-cudnn-cu12 để DLL trong site-packages/nvidia/*/bin."""
    try:
        import nvidia  # type: ignore
    except ImportError:
        return
    for base in getattr(nvidia, "__path__", []):
        for bin_dir in Path(base).glob("*/bin"):
            os.add_dll_directory(str(bin_dir))
            os.environ["PATH"] = str(bin_dir) + os.pathsep + os.environ.get("PATH", "")


def read_json(path: Path, fallback):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return fallback


def load_players() -> dict:
    raw = read_json(ROOT / "config" / "players.json", {})
    return {k: v for k, v in raw.items() if k.isdigit()}


def speaker_label(user_id: str, players: dict, speakers: dict) -> str:
    p = players.get(user_id)
    if not p:
        return speakers.get(user_id, {}).get("displayName") or f"User {user_id}"
    if p.get("role") == "dm":
        return f"DM ({p['name']})"
    return f"{p['character']} ({p['name']})" if p.get("character") else p["name"]


def build_initial_prompt(players: dict) -> str:
    """Prompt mồi cho Whisper: câu tiếng Việt + tên riêng, giúp nhận đúng tên NPC/nhân vật."""
    # Tên nhân vật PC trước, vì prompt bị cắt ở khoảng 700 ký tự
    names: list[str] = [p.get("character", "") for p in players.values()]
    glossary = ROOT / "config" / "glossary.txt"
    if glossary.exists():
        for line in glossary.read_text(encoding="utf-8").splitlines():
            line = line.split("|")[0].strip()
            if line and not line.startswith("#"):
                names.append(line)
    names = list(dict.fromkeys(n for n in names if n and n != "DM"))
    prompt = "Buổi chơi Dungeons & Dragons bằng tiếng Việt. Tên riêng: " + ", ".join(names) + "."
    return prompt[:700]  # Whisper chỉ nhận khoảng 224 token cho prompt


def load_segments(session_dir: Path) -> list[dict]:
    seg_file = session_dir / "segments.jsonl"
    segments: list[dict] = []
    if seg_file.exists():
        for line in seg_file.read_text(encoding="utf-8").splitlines():
            if line.strip():
                segments.append(json.loads(line))
    else:
        # Dự phòng: dựng lại từ tên file "<startMs>_<userId>.ogg"
        for f in sorted((session_dir / "audio").glob("*.ogg")):
            start, _, user = f.stem.partition("_")
            segments.append({"file": f"audio/{f.name}", "userId": user, "startMs": int(start), "endMs": int(start)})
    return sorted(segments, key=lambda s: s["startMs"])


def fmt_time(ms: int) -> str:
    s = ms // 1000
    return f"{s // 3600:02d}:{s % 3600 // 60:02d}:{s % 60:02d}"


def load_model(env: dict):
    from faster_whisper import WhisperModel

    name = env.get("WHISPER_MODEL", "large-v3-turbo")
    device = env.get("WHISPER_DEVICE", "cuda")
    compute = env.get("WHISPER_COMPUTE_TYPE", "int8_float16")
    try:
        print(f"Đang tải model {name} ({device}, {compute})...", flush=True)
        return WhisperModel(name, device=device, compute_type=compute)
    except Exception as err:  # noqa: BLE001 - thiếu CUDA/cuDNN thì lùi về CPU
        if device == "cpu":
            raise
        print(f"Không dùng được GPU ({err}). Chuyển sang CPU, sẽ chậm hơn nhiều.", flush=True)
        return WhisperModel(name, device="cpu", compute_type="int8")


def decode_audio(path: Path, sampling_rate: int = 16000):
    """Decode .ogg Opus thành mảng float32 mono 16 kHz.

    Tự làm thay cho faster_whisper.decode_audio vì bản đó gọi av.open(metadata_errors=...),
    tham số đã bị PyAV 19 bỏ.
    """
    import av
    import numpy as np

    resampler = av.AudioResampler(format="s16", layout="mono", rate=sampling_rate)
    chunks = []
    with av.open(str(path)) as container:
        for frame in container.decode(audio=0):
            frame.pts = None
            for out in resampler.resample(frame):
                chunks.append(out.to_ndarray().reshape(-1))
        for out in resampler.resample(None):
            chunks.append(out.to_ndarray().reshape(-1))
    if not chunks:
        return np.zeros(0, dtype=np.float32)
    return np.concatenate(chunks).astype(np.float32) / 32768.0


def transcribe_one(model, path: Path, env: dict, initial_prompt: str) -> dict:
    audio = decode_audio(path)
    if audio.size < 16000 * 0.3:
        return {"text": "", "parts": []}
    segments, _info = model.transcribe(
        audio,
        language=env.get("WHISPER_LANGUAGE", "vi") or None,
        beam_size=int(env.get("WHISPER_BEAM_SIZE", "5")),
        vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 500},
        initial_prompt=initial_prompt,
        condition_on_previous_text=False,  # đoạn ngắn rời nhau, tránh lặp câu
        no_speech_threshold=0.6,
    )
    parts = []
    for seg in segments:
        text = seg.text.strip()
        if not text:
            continue
        if seg.no_speech_prob > 0.8 and seg.avg_logprob < -1.0:
            continue
        if HALLUCINATION_RE.search(text):
            continue
        parts.append({"start": round(seg.start, 2), "end": round(seg.end, 2), "text": text})
    return {"text": " ".join(p["text"] for p in parts), "parts": parts}


def write_raw_markdown(session_dir: Path, meta: dict, results: list[dict], players: dict) -> Path:
    speakers = meta.get("speakers", {})
    lines = [
        f"# Transcript thô: session {meta.get('id', session_dir.name)}",
        "",
        f"- Kênh: {meta.get('channelName', '?')}",
        f"- Bắt đầu: {meta.get('startedAt', '?')}",
        "- Người nói: " + ", ".join(sorted({speaker_label(r["userId"], players, speakers) for r in results})),
        "",
        "---",
        "",
    ]
    for r in sorted(results, key=lambda x: x["startMs"]):
        if r["text"]:
            label = speaker_label(r["userId"], players, speakers)
            lines.append(f"[{fmt_time(r['startMs'])}] {label}: {r['text']}")
    out = session_dir / "transcript_raw.md"
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("session_dir", type=Path)
    args = parser.parse_args()
    session_dir: Path = args.session_dir.resolve()

    sys.stdout.reconfigure(encoding="utf-8")
    env = load_env()
    meta = read_json(session_dir / "session.json", {})
    players = load_players()
    segments = load_segments(session_dir)
    if not segments:
        print("Không có đoạn audio nào để chuyển.", flush=True)
        return 1

    cache_file = session_dir / "transcripts.jsonl"
    done: dict[str, dict] = {}
    if cache_file.exists():
        for line in cache_file.read_text(encoding="utf-8").splitlines():
            if line.strip():
                item = json.loads(line)
                if "error" not in item:  # đoạn lỗi thì lần sau thử lại
                    done[item["file"]] = item

    todo = [s for s in segments if s["file"] not in done]
    print(f"Tổng {len(segments)} đoạn, cần chuyển {len(todo)} đoạn.", flush=True)

    if todo:
        setup_cuda_dlls()
        model = load_model(env)
        initial_prompt = build_initial_prompt(players)
        t0 = time.time()
        with cache_file.open("a", encoding="utf-8") as cache:
            for i, seg in enumerate(todo, 1):
                audio = session_dir / seg["file"]
                try:
                    result = transcribe_one(model, audio, env, initial_prompt)
                except Exception as err:  # noqa: BLE001 - một file hỏng không được làm dừng cả session
                    print(f"Lỗi ở {seg['file']}: {err}", flush=True)
                    result = {"text": "", "parts": [], "error": str(err)}
                item = {**seg, **result}
                if "error" not in item:
                    done[seg["file"]] = item
                cache.write(json.dumps(item, ensure_ascii=False) + "\n")
                cache.flush()
                print(f"PROGRESS {i}/{len(todo)}", flush=True)
        print(f"Xong STT trong {time.time() - t0:.0f} giây.", flush=True)

    out = write_raw_markdown(session_dir, meta, list(done.values()), players)
    print(f"OUTPUT {out}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
