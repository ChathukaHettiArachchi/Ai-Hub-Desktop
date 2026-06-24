# AI Hub Desktop

AI Hub Desktop is a privacy-focused local AI platform that allows you to run, manage, and compare multiple AI models directly on your computer. Built on ASP.NET Core and llama.cpp, it provides a modern chat experience without requiring cloud services, API keys, or Ollama.

## Features

### Local AI Execution

* Run GGUF models locally using llama.cpp
* No Ollama dependency
* No cloud APIs required
* Fully offline after setup

### Multi-Model Chat

* Select one or two AI models
* Compare responses side-by-side
* Stream responses in real time
* Evaluate different models on the same prompt

### Modern Chat Experience

* Rich text message editor
* Text formatting support (bold, italic, underline, lists, tables, links, etc.)
* Session-based conversations
* Automatic chat history storage
* Session search and sorting
* Responsive desktop interface

### Privacy First

* All processing happens locally
* No external AI services
* No analytics or tracking
* No data leaves your machine
* Chat traffic remains on `127.0.0.1`

## Supported Models

AI Hub Desktop supports any GGUF model compatible with llama.cpp, including:

* Llama 3.x
* TinyLlama
* Phi
* Qwen
* Gemma
* Mistral
* MiniCPM
* Other GGUF-compatible models

## Requirements

### .NET

* .NET 9 SDK or later

### llama.cpp

Download a Windows build of llama.cpp and place the engine files in the application's `engine` folder.

### GGUF Models

Download one or more GGUF models and place them in the `Models` folder.

Example:

```text
Models/
├── Llama-3.2-3B-Instruct-Q4_K_M.gguf
├── tinyllama-1.1b-chat-v1.0.Q2_K.gguf
└── Phi-4.gguf
```

## Project Structure

```text
AI-Hub-Desktop/
│
├── Models/
├── engine/
├── wwwroot/
├── Program.cs
├── appsettings.json
├── engine-settings.json
└── LocalPrivateAIChat.csproj
```

## Running the Application

Clone the repository:

```bash
git clone https://github.com/ChathukaHettiArachchi/Ai-Hub-Desktop.git
cd Ai-Hub-Desktop
```

Run:

```bash
dotnet run
```

Open:

```text
http://127.0.0.1:5055
```

## Using AI Hub Desktop

### Single Model Chat

1. Start the application
2. Select a model
3. Enter your prompt
4. Receive a streamed response

### Compare Mode

1. Select two models
2. Enter a prompt
3. Both models generate responses simultaneously
4. Compare outputs side-by-side

### Session Management

* Create new chat sessions
* Search previous conversations
* Sort sessions by date
* Delete individual sessions
* Clear chat history

## Technical Overview

### Frontend

* HTML5
* Tailwind CSS
* JavaScript
* Summernote Rich Text Editor

### Backend

* ASP.NET Core (.NET 9)
* Server-Sent Events (SSE) streaming
* Local model management
* llama.cpp integration

### Storage

* Local session storage
* Local configuration files
* No external database required

## Architecture

```text
User
  │
  ▼
AI Hub Desktop UI
  │
  ▼
ASP.NET Core Backend
  │
  ▼
llama.cpp Server
  │
  ▼
GGUF Model
```

## Current Features

✅ Local AI execution

✅ Multi-model comparison

✅ Rich text prompts

✅ Session history

✅ Real-time streaming responses

✅ Model management

✅ Local-only processing

✅ Modern desktop-style interface

## Roadmap

* Workpad
* My Links
* Private Chat Mode
* File Upload Support
* Agent Workflows
* Additional Model Management Features
* Export Conversations

## License

This project is provided for educational, research, and personal use.

---

Built with ASP.NET Core, llama.cpp, and GGUF models.
