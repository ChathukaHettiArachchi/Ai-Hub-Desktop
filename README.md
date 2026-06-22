# Local Private AI Chat

An Ollama-free local chat app. The ASP.NET Core app manages a local `llama.cpp` server process and chats with downloaded `.gguf` models such as Llama, Mistral, Qwen, Gemma, and other GGUF-compatible models.

## Privacy defaults

- No cloud API keys.
- No Ollama dependency.
- No external scripts or analytics.
- Chat traffic goes only to `127.0.0.1`.
- After the engine and model files are installed, chat works without internet.

## What you need once

1. Download or build `llama.cpp` for Windows.
2. Locate `llama-server.exe`.
3. Download a GGUF model file, for example a Mistral or Llama instruct model.

Recommended folder layout:

```text
C:\llama.cpp\llama-server.exe
C:\models\mistral-7b-instruct.gguf
```

You can also put `.gguf` files in this app's `Models` folder.

## Run the app

```powershell
cd C:\Users\SajithG\Documents\Codex\2026-06-15\i-want-an-app-jus-like\outputs\LocalPrivateAIChat
dotnet run
```

Open:

```text
http://127.0.0.1:5055
```

## Use

1. Set **llama.cpp server** to your `llama-server.exe` path.
2. Select a `.gguf` model or paste the model path.
3. Save.
4. Start.
5. Chat.

## Notes

- The app uses llama.cpp's OpenAI-compatible endpoint: `/v1/chat/completions`.
- The app starts the engine with `--host 127.0.0.1`, so it is local to this machine.
- Increase **GPU layers** if your GPU supports it. Leave it at `0` for CPU-only mode.
