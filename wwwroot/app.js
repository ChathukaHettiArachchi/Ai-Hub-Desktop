// const modelSelect = document.querySelector("#model");
// const refreshModelsButton = document.querySelector("#refreshModels");
// const enginePathInput = document.querySelector("#enginePath");
// const modelPathInput = document.querySelector("#modelPath");
// const portInput = document.querySelector("#port");
// const contextSizeInput = document.querySelector("#contextSize");
// const gpuLayersInput = document.querySelector("#gpuLayers");
// const saveEngineButton = document.querySelector("#saveEngine");
// const startEngineButton = document.querySelector("#startEngine");
// const stopEngineButton = document.querySelector("#stopEngine");
// const modelUrlInput = document.querySelector("#modelUrl");
// const modelFileNameInput = document.querySelector("#modelFileName");
// const downloadModelButton = document.querySelector("#downloadModel");
// const downloadStatus = document.querySelector("#downloadStatus");
// const engineStatus = document.querySelector("#engineStatus");
// const activeModel = document.querySelector("#activeModel");
// const systemPrompt = document.querySelector("#systemPrompt");
// const messages = document.querySelector("#messages");
// const chatForm = document.querySelector("#chatForm");
// const promptInput = document.querySelector("#prompt");
// const sendButton = document.querySelector("#send");
// const newChatButton = document.querySelector("#newChat");
// const messageTemplate = document.querySelector("#messageTemplate");

// let conversation = [];
// let isGenerating = false;
// let currentConfig = null;
// const maxHistoryMessages = 10;
// const maxMessageCharacters = 6000;

// function setStatus(element, text, isError = false) {
//   element.textContent = text;
//   element.style.color = isError ? "var(--danger)" : "var(--muted)";
// }

// function addMessage(role, content, className = "") {
//   const node = messageTemplate.content.firstElementChild.cloneNode(true);
//   node.classList.add(role);
//   if (className) {
//     node.classList.add(className);
//   }
//   node.querySelector(".message-role").textContent = role;
//   node.querySelector(".message-content").textContent = content;
//   messages.append(node);
//   messages.scrollTop = messages.scrollHeight;
//   return node.querySelector(".message-content");
// }

// function setGenerating(value) {
//   isGenerating = value;
//   sendButton.disabled = value;
//   refreshModelsButton.disabled = value;
//   startEngineButton.disabled = value;
//   stopEngineButton.disabled = value;
//   saveEngineButton.disabled = value;
//   sendButton.textContent = value ? "Thinking" : "Send";
// }

// function readConfigFromForm() {
//   return {
//     enginePath: enginePathInput.value.trim(),
//     modelPath: modelPathInput.value.trim(),
//     port: Number(portInput.value || 8080),
//     contextSize: Number(contextSizeInput.value || 4096),
//     gpuLayers: Number(gpuLayersInput.value || 0)
//   };
// }

// function renderConfig(config, status) {
//   currentConfig = config;
//   enginePathInput.value = config.enginePath || "";
//   modelPathInput.value = config.modelPath || "";
//   portInput.value = config.port || 8080;
//   contextSizeInput.value = config.contextSize || 4096;
//   gpuLayersInput.value = config.gpuLayers || 0;
//   activeModel.textContent = config.modelPath ? `Using ${fileName(config.modelPath)}` : "Choose a GGUF model and start the engine";

//   if (status?.running) {
//     setStatus(engineStatus, `Engine running on ${status.endpoint}.`);
//   } else {
//     setStatus(engineStatus, "Engine stopped. Save settings, then start it.", false);
//   }
// }

// async function loadConfig() {
//   const response = await fetch("/api/engine/config", { cache: "no-store" });
//   const data = await response.json();
//   renderConfig(data.config, data.status);
// }

// async function saveConfig() {
//   const response = await fetch("/api/engine/config", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(readConfigFromForm())
//   });
//   const data = await response.json();
//   if (!response.ok) {
//     throw new Error(data.error || "Could not save engine settings.");
//   }
//   renderConfig(data.config, null);
// }

// async function loadModels() {
//   modelSelect.innerHTML = "";
//   setStatus(engineStatus, "Looking for GGUF models...");

//   try {
//     const response = await fetch("/api/models", { cache: "no-store" });
//     const data = await response.json();

//     if (!response.ok) {
//       throw new Error(data.error || "Unable to load models.");
//     }

//     if (!data.models.length) {
//       modelSelect.append(new Option("No GGUF models found", ""));
//       setStatus(engineStatus, "Put .gguf files in the Models folder or enter a model path.", true);
//       return;
//     }

//     modelSelect.append(new Option("Select a model", ""));
//     for (const model of data.models) {
//       modelSelect.append(new Option(`${model.name} (${formatBytes(model.size)})`, model.path));
//     }

//     if (currentConfig?.modelPath) {
//       modelSelect.value = currentConfig.modelPath;
//     }

//     setStatus(engineStatus, `${data.models.length} GGUF model${data.models.length === 1 ? "" : "s"} available.`);
//   } catch (error) {
//     modelSelect.append(new Option("Models unavailable", ""));
//     setStatus(engineStatus, error.message, true);
//   }
// }

// async function startEngine() {
//   await saveConfig();
//   setStatus(engineStatus, "Starting local engine...");
//   const response = await fetch("/api/engine/start", { method: "POST" });
//   const data = await response.json();
//   if (!response.ok) {
//     throw new Error(data.error || "Could not start engine.");
//   }
//   setStatus(engineStatus, data.status.running ? `Engine running on ${data.status.endpoint}.` : data.message);
// }

// async function stopEngine() {
//   const response = await fetch("/api/engine/stop", { method: "POST" });
//   const data = await response.json();
//   if (!response.ok) {
//     throw new Error(data.error || "Could not stop engine.");
//   }
//   setStatus(engineStatus, "Engine stopped.");
// }

// async function downloadModel() {
//   const url = modelUrlInput.value.trim();
//   const fileName = modelFileNameInput.value.trim();
//   if (!url) {
//     setStatus(downloadStatus, "Enter a direct GGUF URL first.", true);
//     return;
//   }

//   downloadModelButton.disabled = true;
//   setStatus(downloadStatus, "Downloading model. Large files can take a while...");

//   try {
//     const response = await fetch("/api/models/download", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ url, fileName })
//     });
//     const data = await response.json();
//     if (!response.ok) {
//       throw new Error(data.error || "Download failed.");
//     }
//     modelPathInput.value = data.model.path;
//     await saveConfig();
//     await loadModels();
//     setStatus(downloadStatus, `Saved ${data.model.name}.`);
//   } catch (error) {
//     setStatus(downloadStatus, error.message, true);
//   } finally {
//     downloadModelButton.disabled = false;
//   }
// }

// async function streamChat(payload, onToken) {
//   const response = await fetch("/api/chat", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(payload)
//   });

//   if (!response.ok && !response.body) {
//     const error = await response.json();
//     throw new Error(error.error || "Chat request failed.");
//   }

//   const reader = response.body.getReader();
//   const decoder = new TextDecoder();
//   let buffer = "";

//   while (true) {
//     const { value, done } = await reader.read();
//     if (done) {
//       break;
//     }

//     buffer += decoder.decode(value, { stream: true });
//     const events = buffer.split("\n\n");
//     buffer = events.pop() || "";

//     for (const eventBlock of events) {
//       const event = parseSse(eventBlock);
//       if (event.event === "token") {
//         onToken(event.data.content || "");
//       }
//       if (event.event === "error") {
//         const details = event.data.details ? `\n\n${event.data.details}` : "";
//         throw new Error(`${event.data.error || "Local engine error."}${details}`);
//       }
//     }
//   }
// }

// function trimForLocalContext(items) {
//   const trimmed = items.map((message) => ({
//     role: message.role,
//     content: message.content.length > maxMessageCharacters
//       ? `${message.content.slice(0, maxMessageCharacters)}\n\n[Older content truncated by the local app to fit the model context.]`
//       : message.content
//   }));

//   const system = trimmed.filter((message) => message.role === "system");
//   const history = trimmed.filter((message) => message.role !== "system");
//   return [...system, ...history.slice(-maxHistoryMessages)];
// }

// function parseSse(block) {
//   const eventLine = block.split("\n").find((line) => line.startsWith("event:"));
//   const dataLine = block.split("\n").find((line) => line.startsWith("data:"));
//   return {
//     event: eventLine ? eventLine.slice(6).trim() : "message",
//     data: dataLine ? JSON.parse(dataLine.slice(5).trim()) : {}
//   };
// }

// function fileName(path) {
//   return path.split(/[\\/]/).pop() || path;
// }

// function formatBytes(bytes) {
//   if (!bytes) {
//     return "0 B";
//   }
//   const units = ["B", "KB", "MB", "GB", "TB"];
//   const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
//   return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
// }

// chatForm.addEventListener("submit", async (event) => {
//   event.preventDefault();
//   if (isGenerating) {
//     return;
//   }

//   const prompt = promptInput.value.trim();
//   if (!modelPathInput.value.trim()) {
//     addMessage("assistant", "Choose a downloaded GGUF model first.", "error");
//     return;
//   }

//   if (!prompt) {
//     return;
//   }

//   promptInput.value = "";
//   addMessage("user", prompt);
//   conversation.push({ role: "user", content: prompt });

//   const assistantBubble = addMessage("assistant", "");
//   let assistantText = "";

//   const messagesForEngine = trimForLocalContext([
//     { role: "system", content: systemPrompt.value.trim() },
//     ...conversation
//   ].filter((message) => message.content));

//   setGenerating(true);
//   try {
//     await streamChat({ messages: messagesForEngine, temperature: 0.7 }, (token) => {
//       assistantText += token;
//       assistantBubble.textContent = assistantText;
//       messages.scrollTop = messages.scrollHeight;
//     });
//     conversation.push({ role: "assistant", content: assistantText });
//   } catch (error) {
//     assistantBubble.parentElement.classList.add("error");
//     assistantBubble.textContent = error.message;
//   } finally {
//     setGenerating(false);
//     promptInput.focus();
//   }
// });

// newChatButton.addEventListener("click", () => {
//   conversation = [];
//   messages.innerHTML = "";
//   promptInput.focus();
// });

// refreshModelsButton.addEventListener("click", loadModels);
// saveEngineButton.addEventListener("click", async () => {
//   try {
//     await saveConfig();
//     setStatus(engineStatus, "Engine settings saved.");
//   } catch (error) {
//     setStatus(engineStatus, error.message, true);
//   }
// });
// startEngineButton.addEventListener("click", async () => {
//   try {
//     await startEngine();
//   } catch (error) {
//     setStatus(engineStatus, error.message, true);
//   }
// });
// stopEngineButton.addEventListener("click", async () => {
//   try {
//     await stopEngine();
//   } catch (error) {
//     setStatus(engineStatus, error.message, true);
//   }
// });
// downloadModelButton.addEventListener("click", downloadModel);
// modelSelect.addEventListener("change", () => {
//   if (modelSelect.value) {
//     modelPathInput.value = modelSelect.value;
//     activeModel.textContent = `Using ${fileName(modelSelect.value)}`;
//   }
// });
// modelPathInput.addEventListener("input", () => {
//   activeModel.textContent = modelPathInput.value ? `Using ${fileName(modelPathInput.value)}` : "Choose a GGUF model and start the engine";
// });

// promptInput.addEventListener("keydown", (event) => {
//   if (event.key === "Enter" && !event.shiftKey) {
//     event.preventDefault();
//     chatForm.requestSubmit();
//   }
// });

// (async function init() {
//   await loadConfig();
//   await loadModels();
// })();




const STORAGE_KEY = "local_ai_hub";

let sessions = [];
let currentSessionId = null;






function createSession() {

    const session = {
        id: Date.now().toString(),
        title: "New Chat",
        messages: []
    };

    sessions.unshift(session);

    currentSessionId = session.id;

    saveSessions();

    renderSessions();
    renderChat();
}

function getCurrentSession() {
    return sessions.find(
        s => s.id === currentSessionId
    );
}

function saveSessions() {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
            currentSessionId,
            sessions
        })
    );
}

function loadSessions() {

    const raw =
        localStorage.getItem(
            STORAGE_KEY
        );

    if (!raw) {
        createSession();
        return;
    }

    const data =
        JSON.parse(raw);

    sessions =
        data.sessions || [];

    currentSessionId =
        data.currentSessionId;

    if (sessions.length === 0) {
        createSession();
        return;
    }

    renderSessions();
    renderChat();
}


function renderSessions() {

    const list =
        document.getElementById(
            "sessionList"
        );

    list.innerHTML = "";

    const search =
        document.getElementById(
            "searchInput"
        ).value.toLowerCase();

    sessions
        .filter(x =>
            x.title.toLowerCase()
                .includes(search)
        )
        .forEach(session => {

            const div =
                document.createElement("div");

            div.className =
                "session" +
                (
                    session.id === currentSessionId
                        ? " active"
                        : ""
                );

            div.innerHTML = `
<div class="sessionContent">
    <span>${session.title}</span>

    <button
        class="deleteSessionBtn"
        data-id="${session.id}">
        🗑️
    </button>
</div>
`;

            div.onclick = e => {

                if (
                    e.target.classList.contains(
                        "deleteSessionBtn"
                    )
                ) {
                    return;
                }

                currentSessionId =
                    session.id;

                saveSessions();

                renderSessions();
                renderChat();
            };

            const deleteBtn =
                div.querySelector(
                    ".deleteSessionBtn"
                );

            deleteBtn.onclick = e => {

                e.stopPropagation();

                if (
                    !confirm(
                        "Delete this chat?"
                    )
                ) {
                    return;
                }

                sessions =
                    sessions.filter(
                        s => s.id !== session.id
                    );

                if (
                    currentSessionId ===
                    session.id
                ) {

                    if (
                        sessions.length
                    ) {
                        currentSessionId =
                            sessions[0].id;
                    }
                    else {
                        createSession();
                        return;
                    }
                }

                saveSessions();

                renderSessions();
                renderChat();
            };

            list.appendChild(div);
        });
}


function renderChat() {

    const messages =
        document.getElementById(
            "messages"
        );

    const emptyState =
        document.getElementById(
            "emptyState"
        );

    messages.innerHTML = "";

    if (emptyState) {
        messages.appendChild(
            emptyState
        );
    }

    const session =
        getCurrentSession();

    if (!session) {
        return;
    }

    document.getElementById(
        "chatTitle"
    ).textContent =
        session.title;

    if (
        session.messages.length === 0
    ) {
        emptyState.style.display =
            "block";
        return;
    }

    emptyState.style.display =
        "none";

    session.messages.forEach(msg => {

        const user =
            document.createElement(
                "div"
            );

        user.className =
            "userBubble";

        user.textContent =
            msg.question;

        messages.appendChild(
            user
        );

        const card =
            document.createElement(
                "div"
            );

        card.className =
            "aiCard";

        card.innerHTML = `
<div class="aiHeader">
Assistant
</div>

<div class="aiBody">
${msg.answer || ""}
</div>
`;

        messages.appendChild(
            card
        );
    });

    messages.scrollTop =
        messages.scrollHeight;
}



document
    .getElementById(
        "newSessionBtn"
    )
    .addEventListener(
        "click",
        createSession
    );

document
    .getElementById(
        "searchInput"
    )
    .addEventListener(
        "input",
        renderSessions
    );

document
    .getElementById(
        "clearChatsBtn"
    )
    .addEventListener(
        "click",
        () => {

            if (
                !confirm(
                    "Delete all chats?"
                )
            ) {
                return;
            }

            sessions = [];

            localStorage.removeItem(
                STORAGE_KEY
            );

            createSession();
        }
    );

loadSessions();




document
.getElementById("send")
?.addEventListener("click", async () => {

    const prompt =
        document
        .getElementById("prompt")
        .value
        .trim();

    if (!prompt)
        return;

    try {

        const response =
            await fetch(
                "/api/chat",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                        "application/json"
                    },
                    body:
                    JSON.stringify({
                        messages: [
                            {
                                role: "user",
                                content: prompt
                            }
                        ],
                        temperature: 0.7
                    })
                }
            );

        console.log(
            await response.text()
        );
    }
    catch (err) {

        console.error(err);
    }
});