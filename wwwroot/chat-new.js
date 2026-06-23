// =====================================================
// UI INITIALIZATION
// =====================================================




document
    .getElementById("settingsToggle")
    ?.addEventListener("click", () => {

        document
            .getElementById("settingsPanel")
            ?.classList.toggle("hidden");
    });



const popup = document.getElementById("desktopPopup");
const popupTitle = document.getElementById("popupTitle");
const popupMessage = document.getElementById("popupMessage");

function showPopup(title, message) {
    popupTitle.textContent = title;
    popupMessage.textContent = message;
    popup.classList.remove("hidden");
}

document.getElementById("privateChatBtn")?.addEventListener("click", () => {
    showPopup(
        "Feature Unavailable",
        "Private Chat is not available in the Desktop version."
    );
});

document.getElementById("myLinksBtn")?.addEventListener("click", () => {
    showPopup(
        "Under Construction",
        "My Links is currently under construction."
    );
});

document.getElementById("workpadBtn")?.addEventListener("click", () => {
    showPopup(
        "Under Construction",
        "Workpad is currently under construction."
    );
});

document.getElementById("closeDesktopPopup")?.addEventListener("click", () => {
    popup.classList.add("hidden");
});

popup?.addEventListener("click", (e) => {
    if (e.target === popup) {
        popup.classList.add("hidden");
    }
});



$(document).ready(function () {
    $('#prompt').summernote({
        placeholder: 'Message the selected agent(s)...',
        tabsize: 2,
        height: 110,
        disableResizeEditor: true,
        toolbar: [
            ['style', ['clear']],
            ['font', ['bold', 'italic', 'underline', 'strikethrough']],
            ['color', ['color']],
            ['para', ['ul', 'ol', 'paragraph']],
            ['table', ['table']],
            ['insert', ['link', 'hr']],
            ['view', ['codeview',]],
           
        ],
        callbacks: {
            onKeydown: function (e) {

    if (
        e.key === 'Enter' &&
        (!e.shiftKey)
    ) {

        e.preventDefault();

        $('#send').trigger('click');
    }
}
        }
    });

    $('.note-editable').css({
        'font-family': "'Montserrat', sans-serif",
        'font-size': '14px'
    });

    $('.note-editable').on('keydown', function (e) {

        if (e.key === 'Enter' && !e.shiftKey) {

            e.preventDefault();

            sendMessage();
        }

    });

    $('.note-editable').on('paste', function (e) {

        e.preventDefault();

        const text =
            (e.originalEvent || e)
                .clipboardData
                .getData('text/plain');

        document.execCommand(
            'insertText',
            false,
            text
        );
    });
});

window.getSummernoteContent = function () {
    return $('#prompt').summernote('code');
};

window.clearSummernote = function () {
    $('#prompt').summernote('reset');
};








const STORAGE_KEY = "local_ai_hub";

// -----------------------------------------------------
// DOM REFERENCES
// -----------------------------------------------------

const sessionList = document.getElementById("sessionList");
const searchInput = document.getElementById("searchInput");
const newSessionBtn = document.getElementById("newSessionBtn");
const clearChatsBtn = document.getElementById("clearChatsBtn");

const messagesContainer = document.getElementById("messages");
const emptyState = document.getElementById("emptyState");
const chatTitle = document.getElementById("chatTitle");

const promptInput = document.getElementById("prompt");
const sendButton = document.getElementById("send");

const modelList = document.getElementById("modelList");
const activeModel = document.getElementById("activeModel");

// -----------------------------------------------------
// STATE
// -----------------------------------------------------

let sessions = [];
let currentSessionId = null;

let availableModels = [];
let selectedModels = [];

let isGenerating = false;

let sortDescending = true;

let composerExpanded = false;

// -----------------------------------------------------
// SESSION HELPERS
// -----------------------------------------------------

function getCurrentSession() {
    return sessions.find(
        s => s.id === currentSessionId
    );
}

function updateComposerPosition() {

    const composer =
        document.getElementById("chatComposer");

    const messages =
        document.getElementById("messages");

    const session =
        getCurrentSession();

    if (!composer || !messages) return;

    if (!session || session.messages.length === 0) {

        composer.classList.add(
            "chatComposerCentered"
        );

        messages.style.display = "none";

    } else {

        composer.classList.remove(
            "chatComposerCentered"
        );

        messages.style.display = "block";
    }
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

    try {

        const data =
            JSON.parse(raw);

        sessions =
            data.sessions || [];

        sessions.forEach(session => {

            if (!session.updatedAt) {

                session.updatedAt =
                    new Date(
                        Number(session.id)
                    ).toISOString();
            }
        });

        currentSessionId =
            data.currentSessionId;

        if (!sessions.length) {
            createSession();
            return;
        }

        renderSessions();
        renderChat();

    }
    catch {

        createSession();
    }
}

function createSession() {

    const session = {

        id: Date.now().toString(),

        title: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),

        messages: []
    };

    sessions.unshift(session);

    currentSessionId =
        session.id;

    saveSessions();

    updateComposerPosition();
    renderSessions();
    renderChat();

}

function deleteSession(id) {

    sessions =
        sessions.filter(
            s => s.id !== id
        );

    if (!sessions.length) {

        createSession();
        return;
    }

    if (
        currentSessionId === id
    ) {

        currentSessionId =
            sessions[0].id;
    }

    saveSessions();

    renderSessions();
    renderChat();
}

// -----------------------------------------------------
// SESSION LIST UI
// -----------------------------------------------------

function formatSessionDate(dateString) {

    const date =
        typeof dateString === "string" &&
            dateString.includes("T")
            ? new Date(dateString)
            : new Date(Number(dateString));

    const year =
        date.getFullYear();

    const month =
        date.toLocaleString("en-US", {
            month: "short"
        });

    const day =
        String(date.getDate())
            .padStart(2, "0");

    const weekday =
        date.toLocaleString("en-US", {
            weekday: "short"
        });

    const time =
        date.toLocaleString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true
        });

    return `${year} ${month} ${day} ${weekday} | ${time}`;
}




const filterBtn =
    document.getElementById(
        "filterBtn"
    );

filterBtn?.addEventListener(
    "click",
    () => {

        sortDescending =
            !sortDescending;

        renderSessions();

        filterBtn.title =
            sortDescending
                ? "Newest First"
                : "Oldest First";
    }
);


function updateClock() {

    const now = new Date();

    const formatted =
        `${now.getFullYear()} ` +
        `${now.toLocaleString("en-US", { month: "short" })} ` +
        `${String(now.getDate()).padStart(2, "0")} ` +
        `${now.toLocaleString("en-US", { weekday: "short" }).toLowerCase()} | ` +
        `${now.toLocaleString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true
        })}`;

    document.getElementById("sessionTimestamp").textContent =
        formatted;
}

updateClock();
setInterval(updateClock, 1000);



function renderSessions() {

    sessionList.innerHTML = "";

    sessions.sort((a, b) => {

        const dateA =
            new Date(a.updatedAt);

        const dateB =
            new Date(b.updatedAt);

        return sortDescending
            ? dateB - dateA
            : dateA - dateB;
    });

    const search =
        searchInput.value
            .trim()
            .toLowerCase();

    sessions
        .filter(s =>
            s.title
                .toLowerCase()
                .includes(search)
        )
        .forEach(session => {

            const div =
                document.createElement(
                    "div"
                );

            div.className =
                "session" +
                (
                    session.id === currentSessionId
                        ? " active"
                        : ""
                );

            div.innerHTML = `
<div class="sessionContent">

    <div class="sessionText">
        <div class="sessionTitle">
            ${escapeHtml(session.title)}
        </div>

        <div class="sessionDate">
            ${session.messages.length > 0
        ? formatSessionDate(session.updatedAt)
        : ""}
        </div>
    </div>

    <button
        class="deleteSessionBtn"
        data-id="${session.id}">
        <img src="/images/delete.png" alt="Delete" class="deleteIcon">
    </button>

</div>
`;

            div.addEventListener(
                "click",
                e => {

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
                }
            );

            const deleteBtn =
                div.querySelector(
                    ".deleteSessionBtn"
                );

            deleteBtn.addEventListener(
                "click",
                e => {

                    e.stopPropagation();

                    if (
                        confirm(
                            "Delete this session?"
                        )
                    ) {

                        deleteSession(
                            session.id
                        );
                    }
                }
            );

            sessionList.appendChild(
                div
            );
        });
}

// -----------------------------------------------------
// CHAT UI
// -----------------------------------------------------

const MODEL_COLORS = {
    "Llama-3.2": "#cc641f",
    "tinyllama-1.1": "#5D87B3",
    "Phi-4": "#8B74B8",
    "Qwen3": "#5E9A7A"
};

function getModelColor(modelName) {

    const name =
        displayModelName(modelName)
            .toLowerCase();

    if (name.includes("llama-3.2"))
        return "#cc641f";

    if (name.includes("tinyllama-1.1"))
        return "#5D87B3";

    if (name.includes("phi-4"))
        return "#8B74B8";

    if (name.includes("qwen"))
        return "#5E9A7A";

    return "#475569";
}



function renderChat() {

    messagesContainer.innerHTML = "";

    const session =
        getCurrentSession();

    updateComposerPosition();

    if (!session) {
        return;
    }

    //hide session title 
    // chatTitle.textContent =
    //     session.title;
        

    if (
        !session.messages.length
    ) {

        emptyState.style.display =
            "block";

        messagesContainer.appendChild(
            emptyState
        );

        return;
    }

    emptyState.style.display =
        "none";

    session.messages.forEach(
        message => {

            // Handle comparison mode (multiple responses)
            if (message.responses &&
                Array.isArray(message.responses) &&
                message.responses.length > 0) {

                renderComparisonMessageFromStorage(
                    message.question,
                    message.responses
                );
            }
            // Handle single response mode
            else {
                renderMessage(
                    message.question,
                    message.answer,
                    message.model
                );
            }
        }
    );

    scrollToBottom();
}

function renderMessage(
    question,
    answer,
    modelName
) {

    const user =
        document.createElement(
            "div"
        );

    user.className =
        "userBubble";

    user.innerHTML = question
    .replace(/^<p>/i, "")
    .replace(/<\/p>$/i, "");

    messagesContainer.appendChild(
        user
    );

    const card =
        document.createElement(
            "div"
        );

    card.className =
        "aiCard";

    card.innerHTML = `
<div class="aiHeader"
     style="background:${getModelColor(modelName)}">
${escapeHtml(modelName || "Assistant")}
</div>

<div class="aiBody">
${escapeHtml(answer || "")}
</div>
`;

    messagesContainer.appendChild(
        card
    );

    return card.querySelector(
        ".aiBody"
    );
}

function renderComparisonMessageFromStorage(
    question,
    responses
) {

    const user =
        document.createElement("div");

    user.className =
        "userBubble";

    user.innerHTML = question;

    messagesContainer.appendChild(
        user
    );

    const wrapper =
        document.createElement("div");

    wrapper.className =
        "comparisonWrapper";

    wrapper.innerHTML = `
<div class="comparisonCards">

    <div class="aiCard">
        <div class="aiHeader modelA"></div>

        <div class="aiBody modelAContent">
        </div>
    </div>

    <div class="aiCard">
       <div class="aiHeader modelB"></div>

        <div class="aiBody modelBContent">
        </div>
    </div>

</div>
`;

    messagesContainer.appendChild(
        wrapper
    );

    const modelAContent =
        wrapper.querySelector(
            ".modelAContent"
        );

    const modelBContent =
        wrapper.querySelector(
            ".modelBContent"
        );

    const modelAHeader =
        wrapper.querySelector(
            ".modelA"
        );

    const modelBHeader =
        wrapper.querySelector(
            ".modelB"
        );

    if (responses[0]) {

        modelAHeader.textContent =
            responses[0].model || "Model A";

        modelAHeader.style.backgroundColor =
            getModelColor(responses[0].model);

        modelAHeader.style.color =
            "white";

        modelAContent.textContent =
            responses[0].answer || "";
    }

    if (responses[1]) {

        modelBHeader.textContent =
            responses[1].model || "Model B";

        modelBHeader.style.backgroundColor =
            getModelColor(responses[1].model);

        modelBHeader.style.color =
            "white";

        modelBContent.textContent =
            responses[1].answer || "";


    }

    return wrapper;
}

function renderComparisonMessage(
    question
) {

    const user =
        document.createElement("div");

    user.className =
        "userBubble";

    user.innerHTML = question;

    messagesContainer.appendChild(
        user
    );

    const wrapper =
        document.createElement("div");

    wrapper.className =
        "comparisonWrapper";

    wrapper.innerHTML = `
<div class="comparisonStatus">
    Generating responses...
</div>

<div class="comparisonCards">

    <div class="aiCard">
        <div class="aiHeader modelA"></div>

        <div class="aiBody modelAContent">
        </div>
    </div>

    <div class="aiCard">
       <div class="aiHeader modelB"></div>

        <div class="aiBody modelBContent">
        </div>
    </div>

</div>
`;

    messagesContainer.appendChild(
        wrapper
    );

    return {

        wrapper,

        status:
            wrapper.querySelector(
                ".comparisonStatus"
            ),

        cards:
            wrapper.querySelector(
                ".comparisonCards"
            ),

        modelA:
            wrapper.querySelector(
                ".modelAContent"
            ),

        modelB:
            wrapper.querySelector(
                ".modelBContent"
            ),

        modelAHeader:
            wrapper.querySelector(
                ".modelA"
            ),

        modelBHeader:
            wrapper.querySelector(
                ".modelB"
            )
    };
}




function scrollToBottom() {

    messagesContainer.scrollTop =
        messagesContainer.scrollHeight;
}

// -----------------------------------------------------
// UTILITIES
// -----------------------------------------------------

function escapeHtml(text) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        text;

    return div.innerHTML;
}

// -----------------------------------------------------
// EVENTS
// -----------------------------------------------------

newSessionBtn.addEventListener(
    "click",
    createSession
);

searchInput.addEventListener(
    "input",
    renderSessions
);

clearChatsBtn.addEventListener(
    "click",
    () => {

        if (
            !confirm(
                "Delete all sessions?"
            )
        ) {
            return;
        }

        localStorage.removeItem(
            STORAGE_KEY
        );

        sessions = [];

        createSession();
    }
);

// -----------------------------------------------------
// INIT
// -----------------------------------------------------

loadSessions();



// =====================================================
// PART 2 - ENGINE CONTROLS
// =====================================================

const enginePathInput =
    document.getElementById(
        "enginePath"
    );

const modelPathInput =
    document.getElementById(
        "modelPath"
    );

const portInput =
    document.getElementById(
        "port"
    );

const contextSizeInput =
    document.getElementById(
        "contextSize"
    );

const gpuLayersInput =
    document.getElementById(
        "gpuLayers"
    );

const saveEngineButton =
    document.getElementById(
        "saveEngine"
    );

const startEngineButton =
    document.getElementById(
        "startEngine"
    );

const stopEngineButton =
    document.getElementById(
        "stopEngine"
    );

const refreshModelsButton =
    document.getElementById(
        "refreshModels"
    );

const modelSelect =
    document.getElementById(
        "model"
    );

const engineStatus =
    document.getElementById(
        "engineStatus"
    );

const modelUrlInput =
    document.getElementById(
        "modelUrl"
    );

const modelFileNameInput =
    document.getElementById(
        "modelFileName"
    );

const downloadModelButton =
    document.getElementById(
        "downloadModel"
    );

const downloadStatus =
    document.getElementById(
        "downloadStatus"
    );

const systemPrompt =
    document.getElementById(
        "systemPrompt"
    );

// =====================================================
// STATUS HELPERS
// =====================================================

function setEngineStatus(
    text,
    isError = false
) {

    engineStatus.textContent =
        text;

    engineStatus.style.color =
        isError
            ? "#dc2626"
            : "";
}

function setDownloadStatus(
    text,
    isError = false
) {

    downloadStatus.textContent =
        text;

    downloadStatus.style.color =
        isError
            ? "#dc2626"
            : "";
}

// =====================================================
// CONFIG
// =====================================================

function getConfigFromForm() {

    return {

        enginePath:
            enginePathInput.value.trim(),

        modelPath:
            modelPathInput.value.trim(),

        port:
            Number(
                portInput.value || 8080
            ),

        contextSize:
            Number(
                contextSizeInput.value
                || 4096
            ),

        gpuLayers:
            Number(
                gpuLayersInput.value
                || 0
            )
    };
}

async function loadConfig() {

    const response =
        await fetch(
            "/api/engine/config",
            {
                cache:
                    "no-store"
            }
        );

    const data =
        await response.json();

    const config =
        data.config;

    enginePathInput.value =
        config.enginePath || "";

    modelPathInput.value =
        config.modelPath || "";

    portInput.value =
        config.port || 8080;

    contextSizeInput.value =
        config.contextSize || 4096;

    gpuLayersInput.value =
        config.gpuLayers || 0;

    if (
        data.status?.running
    ) {

        setEngineStatus(
            `Engine running on ${data.status.endpoint}`
        );
    }
    else {

        setEngineStatus(
            "Engine stopped"
        );
    }

    if (
        config.modelPath
    ) {

        // activeModel.textContent =
        //     fileName(
        //         config.modelPath
        //     );
    }
}

async function saveConfig() {

    const response =
        await fetch(
            "/api/engine/config",
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body:
                    JSON.stringify(
                        getConfigFromForm()
                    )
            }
        );

    const data =
        await response.json();

    if (
        !response.ok
    ) {

        throw new Error(
            data.error ||
            "Failed to save config."
        );
    }

    setEngineStatus(
        "Configuration saved."
    );
}

// =====================================================
// ENGINE
// =====================================================

async function startEngine() {

    await saveConfig();

    setEngineStatus(
        "Starting engine..."
    );

    const response =
        await fetch(
            "/api/engine/start",
            {
                method: "POST"
            }
        );

    const data =
        await response.json();

    if (
        !response.ok
    ) {

        throw new Error(
            data.error ||
            "Failed to start engine."
        );
    }

    setEngineStatus(
        data.message ||
        "Engine started."
    );
}

async function stopEngine() {

    const response =
        await fetch(
            "/api/engine/stop",
            {
                method: "POST"
            }
        );

    const data =
        await response.json();

    if (
        !response.ok
    ) {

        throw new Error(
            data.error ||
            "Failed to stop engine."
        );
    }

    setEngineStatus(
        "Engine stopped."
    );
}

// =====================================================
// MODEL LOADING
// =====================================================

async function loadModels() {

    modelSelect.innerHTML = "";

    try {

        const response =
            await fetch(
                "/api/models",
                {
                    cache:
                        "no-store"
                }
            );

        const data =
            await response.json();

        if (
            !response.ok
        ) {

            throw new Error(
                data.error ||
                "Failed to load models."
            );
        }

        availableModels =
            data.models || [];

        modelSelect.append(
            new Option(
                "Select Model",
                ""
            )
        );

        availableModels.forEach(
            model => {

                modelSelect.append(
                    new Option(
                        model.name,
                        model.path
                    )
                );
            }
        );

        renderModelChips();

        setEngineStatus(
            `${availableModels.length} model(s) found`
        );
    }
    catch (err) {

        setEngineStatus(
            err.message,
            true
        );
    }
}

function renderModelChips() {

    modelList.innerHTML = "";

    availableModels.forEach(
        model => {

            const chip =
                document.createElement(
                    "div"
                );

            chip.className =
                "model-chip";

            chip.textContent =
                displayModelName(model.name);

            chip.style.color = "black";



            chip.onclick = () => {

                const index =
                    selectedModels.indexOf(
                        model.path
                    );

                if (index >= 0) {

                    selectedModels.splice(
                        index,
                        1
                    );

                } else {

                    if (
                        selectedModels.length >= 2
                    ) {

                        alert(
                            "You can compare only 2 models."
                        );

                        return;
                    }

                    selectedModels.push(
                        model.path
                    );
                }

                // activeModel.textContent =
                //     selectedModels.length
                //         ? `${selectedModels.length} model(s) selected`
                //         : "No model selected";

                renderModelChips();
            };

            if (
                selectedModels.includes(
                    model.path
                )
            ) {

                chip.classList.add(
                    "selected"
                );

                chip.style.backgroundColor =
                    getModelColor(model.name);

                chip.style.color = "white";

                chip.style.borderColor = "white";
            }

            modelList.appendChild(
                chip
            );
        }
    );
}

// =====================================================
// DOWNLOAD MODEL
// =====================================================

async function downloadModel() {

    const url =
        modelUrlInput.value.trim();

    const fileNameValue =
        modelFileNameInput.value.trim();

    if (!url) {

        setDownloadStatus(
            "Enter a model URL first.",
            true
        );

        return;
    }

    try {

        downloadModelButton.disabled =
            true;

        setDownloadStatus(
            "Downloading..."
        );

        const response =
            await fetch(
                "/api/models/download",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify({
                            url,
                            fileName:
                                fileNameValue
                        })
                }
            );

        const data =
            await response.json();

        if (
            !response.ok
        ) {

            throw new Error(
                data.error ||
                "Download failed."
            );
        }

        modelPathInput.value =
            data.model.path;

        selectedModel =
            data.model.path;

        setDownloadStatus(
            `Downloaded ${data.model.name}`
        );

        await loadModels();
    }
    catch (err) {

        setDownloadStatus(
            err.message,
            true
        );
    }
    finally {

        downloadModelButton.disabled =
            false;
    }
}

// =====================================================
// HELPERS
// =====================================================

function fileName(path) {

    return path
        .split(/[\\/]/)
        .pop();
}

function displayModelName(path) {

    const name = path
        .split(/[\\/]/)
        .pop()
        .replace(".gguf", "");

    return name
        .replace(/-Q.*$/i, "")
        .replace(/-Instruct.*$/i, "")
        .replace(/-chat.*$/i, "");
}

// =====================================================
// EVENTS
// =====================================================

saveEngineButton
    ?.addEventListener(
        "click",
        async () => {

            try {

                await saveConfig();
            }
            catch (err) {

                setEngineStatus(
                    err.message,
                    true
                );
            }
        }
    );

startEngineButton
    ?.addEventListener(
        "click",
        async () => {

            try {

                await startEngine();
            }
            catch (err) {

                setEngineStatus(
                    err.message,
                    true
                );
            }
        }
    );

stopEngineButton
    ?.addEventListener(
        "click",
        async () => {

            try {

                await stopEngine();
            }
            catch (err) {

                setEngineStatus(
                    err.message,
                    true
                );
            }
        }
    );

refreshModelsButton
    ?.addEventListener(
        "click",
        loadModels
    );

downloadModelButton
    ?.addEventListener(
        "click",
        downloadModel
    );

modelSelect
    ?.addEventListener(
        "change",
        () => {

            if (
                modelSelect.value
            ) {

                selectedModel =
                    modelSelect.value;

                modelPathInput.value =
                    modelSelect.value;

                activeModel.textContent =
                    fileName(
                        modelSelect.value
                    );

                renderModelChips();
            }
        }
    );

// =====================================================
// INIT ENGINE
// =====================================================

(async () => {

    try {

        await loadConfig();

        await loadModels();
    }
    catch (err) {

        console.error(err);
    }
})();


// =====================================================
// PART 3 - CHAT + STREAMING
// =====================================================

const MAX_HISTORY_MESSAGES = 60;
const MAX_MESSAGE_CHARACTERS = 6000;

// -----------------------------------------------------
// GENERATION STATE
// -----------------------------------------------------

function setGenerating(value) {

    isGenerating = value;

    sendButton.disabled = value;

   
}

// -----------------------------------------------------
// SSE PARSER
// -----------------------------------------------------

function parseSse(block) {

    const lines =
        block.split("\n");

    const eventLine =
        lines.find(
            x =>
                x.startsWith(
                    "event:"
                )
        );

    const dataLine =
        lines.find(
            x =>
                x.startsWith(
                    "data:"
                )
        );

    return {

        event:
            eventLine
                ? eventLine
                    .slice(6)
                    .trim()
                : "message",

        data:
            dataLine
                ? JSON.parse(
                    dataLine
                        .slice(5)
                        .trim()
                )
                : {}
    };
}

// -----------------------------------------------------
// HISTORY TRIM
// -----------------------------------------------------

function trimForContext(messages) {

    const trimmed =
        messages.map(
            msg => ({

                role:
                    msg.role,

                content:
                    msg.content.length >
                        MAX_MESSAGE_CHARACTERS

                        ? msg.content.slice(
                            0,
                            MAX_MESSAGE_CHARACTERS
                        )

                        : msg.content
            })
        );

    const system =
        trimmed.filter(
            x =>
                x.role ===
                "system"
        );

    const history =
        trimmed.filter(
            x =>
                x.role !==
                "system"
        );

    return [

        ...system,

        ...history.slice(
            -MAX_HISTORY_MESSAGES
        )
    ];
}

// -----------------------------------------------------
// STREAM CHAT
// -----------------------------------------------------

async function streamChat(
    payload,
    onToken
) {

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
                    JSON.stringify(
                        payload
                    )
            }
        );

    if (
        !response.ok &&
        !response.body
    ) {

        const error =
            await response.json();

        throw new Error(
            error.error ||
            "Chat failed."
        );
    }

    const reader =
        response.body.getReader();

    const decoder =
        new TextDecoder();

    let buffer = "";
    // let runningModel = null;

    while (true) {

        const {
            value,
            done
        } =
            await reader.read();

        if (done) {
            break;
        }

        buffer +=
            decoder.decode(
                value,
                {
                    stream: true
                }
            );

        const chunks =
            buffer.split(
                "\n\n"
            );

        buffer =
            chunks.pop() ||
            "";

        for (
            const chunk
            of chunks
        ) {

            const event =
                parseSse(
                    chunk
                );


            //                 if (
            //     event.event ===
            //     "model"
            // ) {

            //     runningModel =
            //         event.data.model;

            //     alert(
            //         `Running model: ${runningModel}`
            //     );
            // }





            if (
                event.event ===
                "token"
            ) {

                onToken(
                    event.data.content ||
                    ""
                );
            }

            if (
                event.event ===
                "error"
            ) {

                throw new Error(
                    event.data.error ||
                    "Engine error."
                );
            }
        }
    }
}



async function generateAnswer(
    modelPath,
    payload
) {

    let answer = "";

    await streamChat(
        {
            ...payload,
            modelPath
        },

        token => {
            answer += token;
        }
    );

    return answer;
}

// -----------------------------------------------------
// SEND MESSAGE
// -----------------------------------------------------

async function sendMessage() {

    if (
        isGenerating
    ) {
        return;
    }

    const question = $('#prompt').summernote('code');

    if (!question || question === '<p><br></p>') {
        return;
    }

    if (selectedModels.length === 0) {

        alert("Select at least one Engine.");
        return;
    }

    $('#prompt').summernote('code', '');

    const session =
        getCurrentSession();

    if (
        !session
    ) {
        return;
    }

    if (
        session.messages
            .length === 0
    ) {

        const plainQuestion = $('<div>')
            .html(question)
            .text()
            .trim();

        if (session.messages.length === 0) {

            session.title =
                plainQuestion.length > 40
                    ? plainQuestion.slice(0, 40) + "..."
                    : plainQuestion;

            renderSessions();
        }
    }

    const compareMode =
        selectedModels.length === 2;

    $('#prompt').summernote('reset');

    const chatItem = {

        question,

        answer: "",

        model: !compareMode
            ? displayModelName(selectedModels[0])
            : undefined
    };

    session.messages.push(
        chatItem
    );
    updateComposerPosition();

    session.updatedAt =
        new Date().toISOString();

    saveSessions();
    renderSessions();

    let answerElement;
    let comparisonUI;

    if (compareMode) {

        comparisonUI =
            renderComparisonMessage(
                question
            );
        const modelA =
            displayModelName(selectedModels[0]);

        const modelB =
            displayModelName(selectedModels[1]);

        comparisonUI.modelAHeader.textContent =
            modelA;

        comparisonUI.modelBHeader.textContent =
            modelB;

        comparisonUI.modelAHeader.style.backgroundColor =
            getModelColor(modelA);

        comparisonUI.modelBHeader.style.backgroundColor =
            getModelColor(modelB);

        comparisonUI.modelAHeader.style.color = "white";
        comparisonUI.modelBHeader.style.color = "white";

    } else {

        answerElement =
            renderMessage(
                question,
                "",
                displayModelName(selectedModels[0])
            );
    }

    scrollToBottom();

    const history = [];

    session.messages.forEach(
        item => {

            history.push({
                role: "user",
                content:
                    item.question
            });

            if (
                item.answer
            ) {

                history.push({
                    role:
                        "assistant",
                    content:
                        item.answer
                });
            }
            else if (
                item.responses &&
                Array.isArray(item.responses)
            ) {

                const combined =
                    item.responses
                        .map(r =>
                            `[${r.model}]: ${r.answer}`
                        )
                        .join("\n\n");

                history.push({
                    role:
                        "assistant",
                    content:
                        combined
                });
            }
        }
    );

    const payload = {

        messages:
            trimForContext([

                {
                    role:
                        "system",
                    content:
                        systemPrompt.value
                            .trim()
                },

                ...history
            ]),

        temperature:
            0.7
    };

    let fullAnswer =
        "";

    setGenerating(
        true
    );

    try {

        if (!compareMode) {

            const answer =
                await generateStreamingAnswer(
                    selectedModels[0],
                    payload,
                    answerElement
                );

            chatItem.answer =
                answer;

            session.updatedAt =
                new Date().toISOString();

            saveSessions();

            renderSessions();
        }


        else {

            comparisonUI.status.textContent =
                "Both models are generating...";

            const promiseA =
                generateStreamingAnswer(
                    selectedModels[0],
                    payload,
                    comparisonUI.modelA
                );

            const promiseB =
                generateStreamingAnswer(
                    selectedModels[1],
                    payload,
                    comparisonUI.modelB
                );

            const [answerA, answerB] =
                await Promise.all([
                    promiseA,
                    promiseB
                ]);




            comparisonUI.modelA.textContent =
                answerA;

            comparisonUI.modelB.textContent =
                answerB;

            comparisonUI.status.remove();

            comparisonUI.cards.classList.remove(
                "hidden"
            );

            scrollToBottom();

            chatItem.responses = [
                {
                    model: displayModelName(selectedModels[0]),
                    answer: answerA
                },
                {
                    model: displayModelName(selectedModels[1]),
                    answer: answerB
                }
            ];

            session.updatedAt =
                new Date().toISOString();

            delete chatItem.answer;
        }

        saveSessions();
        renderSessions();
    }
    catch (err) {

        if (!compareMode && answerElement) {
            answerElement.textContent =
                err.message;
        }

        console.error(
            err
        );
    }
    finally {

        setGenerating(
            false
        );

        saveSessions();

        promptInput.focus();
    }
}



async function generateStreamingAnswer(
    modelPath,
    payload,
    outputElement
) {

    let answer = "";

    outputElement.classList.add("streaming");

    await streamChat(
        {
            ...payload,
            modelPath
        },

        token => {

            answer += token;

            outputElement.textContent =
                answer;

            scrollToBottom();
        }
    );

    outputElement.classList.remove("streaming");

    return answer;
}



// -----------------------------------------------------
// SEND EVENTS
// -----------------------------------------------------

sendButton
    ?.addEventListener(
        "click",
        sendMessage
    );

promptInput
    ?.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                sendMessage();
            }
        }
    );

    const expander =
    document.getElementById(
        "composerExpander"
    );

let isDragging = false;
let startY = 0;
let startHeight = 110;

expander?.addEventListener(
    "mousedown",
    (e) => {

        const editor =
            document.querySelector(
                ".note-editable"
            );

        isDragging = true;

        startY = e.clientY;

        startHeight =
            editor.offsetHeight;

        e.preventDefault();
    }
);

document.addEventListener(
    "mousemove",
    (e) => {

        if (!isDragging) return;

        const editor =
            document.querySelector(
                ".note-editable"
            );

        const delta =
            startY - e.clientY;

        const newHeight =
            Math.max(
                110,
                Math.min(
                    startHeight + delta,
                    500
                )
            );

        editor.style.minHeight =
            `${newHeight}px`;

        editor.style.maxHeight =
            `${newHeight}px`;

        composerExpanded =
            newHeight > 200;

        expander.textContent =
            composerExpanded
                ? "⌄"
                : "⌃";
    }
);

document.addEventListener(
    "mouseup",
    () => {

        isDragging = false;
    }
);



// =====================================================
// END OF FILE
// =====================================================

// window.addEventListener("unload", () => {
//     navigator.sendBeacon(
//         "/api/engine/client-disconnected"
//     );
// });

// window.addEventListener("beforeunload", () => {
//     navigator.sendBeacon("/api/application/exit");
// });

setInterval(() => {
    fetch("/api/ping", {
        method: "POST"
    });
}, 5000);