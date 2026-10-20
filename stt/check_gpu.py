"""Kiểm tra faster-whisper có chạy được trên GPU không, và tải sẵn model."""

import sys
import time

from transcribe import load_env, load_model, setup_cuda_dlls

sys.stdout.reconfigure(encoding="utf-8")
setup_cuda_dlls()

import ctranslate2  # noqa: E402

print("Số GPU CUDA thấy được:", ctranslate2.get_cuda_device_count())
env = load_env()
t0 = time.time()
model = load_model(env)
print(f"Tải model xong sau {time.time() - t0:.0f} giây, thiết bị: {model.model.device}")
