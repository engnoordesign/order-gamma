# Order Gamma

**Phase 1:** upload a file or photo, list your requirements under **Setup rules** (gear icon), and the AI checks whether the file contains each one and extracts the data as text.

For each requirement you get Found / Missing, the extracted value, a confidence score and a note, plus the full transcribed text of the document.

## Run it (local, no API key)

1. Install [Node.js](https://nodejs.org) and [Ollama](https://ollama.com).
2. Pull a vision model:
   ```
   ollama pull qwen2.5vl:7b
   ```
3. Start the app and open http://localhost:3000:
   ```
   node server.js
   ```

No `npm install` is needed. The app has no dependencies.

## Windows: one-click setup and start

1. Double-click **Setup.bat** (it installs Node.js and Ollama with winget if missing, downloads the model, and puts two icons on your Desktop: **Order Gamma** and **Order Gamma - Setup**).
2. From then on, double-click the **Order Gamma** icon. It starts the app and opens http://localhost:3000. Close the black window to stop it.

If you move the folder, run Setup.bat again so the icons point to the new place.

## Supported files

| File | Ollama (default) | Claude backend |
|---|---|---|
| Images (JPG, PNG, WebP, GIF) | yes | yes |
| PDF | first 2 pages, converted to images in the browser | full document |
| Text, CSV, JSON, Markdown | yes | yes |

## Optional: Claude backend

For better accuracy and speed, put an Anthropic API key in a `.env` file next to `server.js`:

```
ANTHROPIC_API_KEY=your-key
```

The app then uses Claude automatically. Add `GAMMA_BACKEND=ollama` to force Ollama.

## Settings (environment variables or `.env`)

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3000` | Web port |
| `GAMMA_MODEL` | `qwen2.5vl:7b` | Ollama model |
| `OLLAMA_URL` | `http://127.0.0.1:11434` | Ollama address |
| `ANTHROPIC_API_KEY` | none | Enables the Claude backend |
| `CLAUDE_MODEL` | `claude-sonnet-5-5` | Claude model |
| `GAMMA_BACKEND` | auto | Set to `ollama` to force local |

## Notes

- Local models on a CPU are slow: expect several minutes per page. A GPU or the Claude backend is much faster.
- Files you upload are processed on your own machine with Ollama. With the Claude backend they are sent to Anthropic.
- The AI is told never to invent data. Check important results yourself.
- `public/pdf.min.js` and `public/pdf.worker.min.js` are [pdf.js](https://github.com/mozilla/pdf.js) 3.11.174 (Apache-2.0).

## License

MIT

## Run in GitHub Codespaces

Open the repo on GitHub, choose **Code → Codespaces → Create codespace on main**. The dev container installs Ollama, downloads the model and starts the app on port 3000 (first start takes several minutes). Codespaces have no GPU, so analysis is slow; set `ANTHROPIC_API_KEY` as a Codespaces secret to use the Claude backend instead.
