#!/usr/bin/env bash
# Runs once when the Codespace is created: install Ollama and download the vision model.
set -e
sudo apt-get update -y
sudo apt-get install -y zstd curl
curl -fsSL https://ollama.com/install.sh | sh
nohup ollama serve > /tmp/ollama.log 2>&1 &
for i in $(seq 1 30); do curl -s http://127.0.0.1:11434/api/tags > /dev/null && break; sleep 2; done
ollama pull "${GAMMA_MODEL:-qwen2.5vl:7b}"
