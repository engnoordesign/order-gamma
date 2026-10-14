#!/usr/bin/env bash
# Runs every time the Codespace starts: make sure Ollama is up, then start Order Gamma on port 3000.
curl -s http://127.0.0.1:11434/api/tags > /dev/null || nohup ollama serve > /tmp/ollama.log 2>&1 &
nohup node server.js > /tmp/gamma.log 2>&1 &
