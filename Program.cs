using System.Diagnostics;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

builder.Services.AddHttpClient("local-engine", client =>
{
    client.Timeout = TimeSpan.FromMinutes(30);
});

builder.Services.AddSingleton<TitleGeneratorRunner>();

builder.Services.AddSingleton<TitleGeneratorService>();

var app = builder.Build();

var titleRunner =
    app.Services.GetRequiredService<TitleGeneratorRunner>();

app.Lifetime.ApplicationStopping.Register(() =>
{
    titleRunner.Stop();
});


var contentRoot = app.Environment.ContentRootPath;
var modelsDirectory = Path.Combine(contentRoot, "Models");
var settingsPath = Path.Combine(contentRoot, "engine-settings.json");
Directory.CreateDirectory(modelsDirectory);

var engineRunner = new EngineRunner();
DateTime lastPing = DateTime.UtcNow;

app.Lifetime.ApplicationStopping.Register(() => engineRunner.Stop());

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet("/api/health", () =>
{
    return Results.Ok(new
    {
        status = "ok",
        privacy = "local-only",
        engine = "managed llama.cpp process",
        ollama = "not used"
    });
});

app.MapPost("/api/ping", () =>
{
    lastPing = DateTime.UtcNow;
    return Results.Ok();
});


app.MapGet("/api/engine/config", () =>
{
    var config = LoadConfig();
    return Results.Ok(new
    {
        config,
        status = engineRunner.GetStatus(config),
        modelsPath = modelsDirectory
    });
});

app.MapPost("/api/engine/config", async (EngineConfig config, CancellationToken cancellationToken) =>
{
    var cleanConfig = config with
    {
        EnginePath = config.EnginePath.Trim(),
        ModelPath = config.ModelPath.Trim(),
        Port = config.Port is >= 1024 and <= 65535 ? config.Port : 8080,
        ContextSize = Math.Clamp(config.ContextSize, 512, 131072),
        GpuLayers = Math.Clamp(config.GpuLayers, 0, 999)
    };

    await File.WriteAllTextAsync(settingsPath, JsonSerializer.Serialize(cleanConfig, JsonOptions.Indented), cancellationToken);
    return Results.Ok(new { config = cleanConfig });
});

app.MapPost("/api/engine/start", async (CancellationToken cancellationToken) =>
{
    var config = LoadConfig();

    if (string.IsNullOrWhiteSpace(config.ModelPath) || !File.Exists(config.ModelPath))
    {
        return Results.BadRequest(new { error = "Choose a downloaded .gguf model file first." });
    }

    var port = engineRunner.GetOrAssignPort(config.ModelPath, config.Port);
    var result = engineRunner.StartModel(config, config.ModelPath, port);
    await Task.Delay(700, cancellationToken);

    return result.Success
        ? Results.Ok(new { status = engineRunner.GetStatus(config), message = result.Message })
        : Results.BadRequest(new { error = result.Message });
});

app.MapPost("/api/engine/stop", () =>
{
    engineRunner.Stop();
    return Results.Ok(new { status = "stopped" });
});

// app.MapPost("/api/engine/client-disconnected", async () =>
// {
//     Console.WriteLine("Browser closed. Stopping engines...");
//      await Task.Delay(5000);


//     engineRunner.Stop();

//     return Results.Ok();
// });


// app.MapPost("/api/application/exit", async () =>
// {
//     _ = Task.Run(async () =>
//     {
//         await Task.Delay(1000);

//         Environment.Exit(0);
//     });

//     return Results.Ok();
// });


app.MapGet("/api/models", () =>
{
    var config = LoadConfig();
    var files = Directory
        .EnumerateFiles(modelsDirectory, "*.gguf", SearchOption.AllDirectories)
        .Select(path => CreateModelInfo(path))
        .ToList();

    if (!string.IsNullOrWhiteSpace(config.ModelPath) && File.Exists(config.ModelPath) &&
        files.All(model => !Path.GetFullPath(model.Path).Equals(Path.GetFullPath(config.ModelPath), StringComparison.OrdinalIgnoreCase)))
    {
        files.Add(CreateModelInfo(config.ModelPath));
    }

    return Results.Ok(new { models = files.OrderBy(model => model.Name) });
});

app.MapPost("/api/models/download", async (
    ModelDownloadRequest request,
    IHttpClientFactory httpClientFactory,
    CancellationToken cancellationToken) =>
{
    if (!Uri.TryCreate(request.Url, UriKind.Absolute, out var uri) || uri.Scheme is not ("http" or "https"))
    {
        return Results.BadRequest(new { error = "Enter a direct http/https URL to a .gguf model file." });
    }

    var fileName = MakeSafeFileName(string.IsNullOrWhiteSpace(request.FileName)
        ? Path.GetFileName(uri.LocalPath)
        : request.FileName);

    if (!fileName.EndsWith(".gguf", StringComparison.OrdinalIgnoreCase))
    {
        fileName += ".gguf";
    }

    var targetPath = Path.Combine(modelsDirectory, fileName);
    var client = httpClientFactory.CreateClient("local-engine");

    await using var remote = await client.GetStreamAsync(uri, cancellationToken);
    await using var file = File.Create(targetPath);
    await remote.CopyToAsync(file, cancellationToken);

    return Results.Ok(new { model = CreateModelInfo(targetPath) });
});

// app.MapPost("/api/chat", async (
//     ChatRequest request,
//     HttpContext context,
//     IHttpClientFactory httpClientFactory,
//     CancellationToken cancellationToken) =>
// {
//     var config = LoadConfig();
//     var engine = GetLoopbackEndpoint(config.Port);
//     if (engine is null)
//     {
//         context.Response.StatusCode = StatusCodes.Status400BadRequest;
//         await context.Response.WriteAsJsonAsync(new { error = "Engine port must resolve to a loopback endpoint." }, cancellationToken);
//         return;
//     }

//     // Use modelPath from request if provided, otherwise fall back to config
//     var modelPath = !string.IsNullOrWhiteSpace(request.ModelPath) 
//         ? request.ModelPath 
//         : config.ModelPath;

//     if (string.IsNullOrWhiteSpace(modelPath))
//     {
//         context.Response.StatusCode = StatusCodes.Status400BadRequest;
//         await context.Response.WriteAsJsonAsync(new { error = "Choose a GGUF model before chatting." }, cancellationToken);
//         return;
//     }

    

//     var chatRequest = new OpenAiChatRequest(
//         Model: Path.GetFileNameWithoutExtension(modelPath),
//         Messages: request.Messages.Select(message => new OpenAiMessage(message.Role, message.Content)).ToArray(),
//         Stream: true,
//         Temperature: request.Temperature);

//     using var httpRequest = new HttpRequestMessage(HttpMethod.Post, new Uri(engine, "/v1/chat/completions"))
//     {
//         Content = JsonContent.Create(chatRequest, options: JsonOptions.Default)
//     };

//     context.Response.Headers.CacheControl = "no-store";
//     context.Response.Headers.XContentTypeOptions = "nosniff";
//     context.Response.ContentType = "text/event-stream; charset=utf-8";

//     try
//     {
//         var client = httpClientFactory.CreateClient("local-engine");
//         using var response = await client.SendAsync(httpRequest, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
//         if (!response.IsSuccessStatusCode)
//         {
//             var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
//             await WriteSseAsync(context.Response, "error", new
//             {
//                 error = "Local engine rejected the request.",
//                 details = FormatEngineError(errorBody)
//             }, cancellationToken);
//             return;
//         }

//         await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
//         using var reader = new StreamReader(stream, Encoding.UTF8);

//         while (!reader.EndOfStream && !cancellationToken.IsCancellationRequested)
//         {
//             var line = await reader.ReadLineAsync(cancellationToken);
//             if (string.IsNullOrWhiteSpace(line) || !line.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
//             {
//                 continue;
//             }

//             var data = line[5..].Trim();
//             if (data.Equals("[DONE]", StringComparison.OrdinalIgnoreCase))
//             {
//                 await WriteSseAsync(context.Response, "done", new { done = true }, cancellationToken);
//                 return;
//             }

//             var chunk = JsonSerializer.Deserialize<OpenAiStreamChunk>(data, JsonOptions.Default);
//             var content = chunk?.Choices?.FirstOrDefault()?.Delta?.Content;
//             if (!string.IsNullOrEmpty(content))
//             {
//                 await WriteSseAsync(context.Response, "token", new { content }, cancellationToken);
//             }
//         }
//     }
//     catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
//     {
//         await WriteSseAsync(context.Response, "error", new
//         {
//             error = "Cannot reach the managed local engine. Start it from Engine Setup first."
//         }, cancellationToken);
//     }
// });

app.MapPost("/api/chat", async (
    ChatRequest request,
    HttpContext context,
    IHttpClientFactory httpClientFactory,
    CancellationToken cancellationToken) =>
{
    var config = LoadConfig();

    var modelPath = !string.IsNullOrWhiteSpace(request.ModelPath)
        ? request.ModelPath
        : config.ModelPath;

    if (string.IsNullOrWhiteSpace(modelPath) || !File.Exists(modelPath))
    {
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        await context.Response.WriteAsJsonAsync(new { error = "Choose a valid GGUF model before chatting." }, cancellationToken);
        return;
    }

    var port = engineRunner.GetOrAssignPort(modelPath, config.Port);

    var engine = GetLoopbackEndpoint(port);
    if (engine is null)
    {
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        await context.Response.WriteAsJsonAsync(new { error = "Engine port must resolve to a loopback endpoint." }, cancellationToken);
        return;
    }

    var startResult = engineRunner.StartModel(config, modelPath, port);
    if (!startResult.Success)
    {
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        await context.Response.WriteAsJsonAsync(new { error = startResult.Message }, cancellationToken);
        return;
    }

    if (startResult.JustStarted)
    {
        await Task.Delay(30000, cancellationToken);
    }

    var chatRequest = new OpenAiChatRequest(
        Model: Path.GetFileNameWithoutExtension(modelPath),
        Messages: request.Messages.Select(message => new OpenAiMessage(message.Role, message.Content)).ToArray(),
        Stream: true,
        Temperature: request.Temperature);

    using var httpRequest = new HttpRequestMessage(HttpMethod.Post, new Uri(engine, "/v1/chat/completions"))
    {
        Content = JsonContent.Create(chatRequest, options: JsonOptions.Default)
    };

    context.Response.Headers.CacheControl = "no-store";
    context.Response.Headers.XContentTypeOptions = "nosniff";
    context.Response.ContentType = "text/event-stream; charset=utf-8";


    await WriteSseAsync(context.Response, "model", new
{
    model = Path.GetFileName(modelPath)
}, cancellationToken);

    try
    {
        var client = httpClientFactory.CreateClient("local-engine");
        using var response = await client.SendAsync(httpRequest, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
            await WriteSseAsync(context.Response, "error", new
            {
                error = "Local engine rejected the request.",
                details = FormatEngineError(errorBody)
            }, cancellationToken);
            return;
        }

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var reader = new StreamReader(stream, Encoding.UTF8);

        while (!reader.EndOfStream && !cancellationToken.IsCancellationRequested)
        {
            var line = await reader.ReadLineAsync(cancellationToken);
            if (string.IsNullOrWhiteSpace(line) || !line.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var data = line[5..].Trim();
            if (data.Equals("[DONE]", StringComparison.OrdinalIgnoreCase))
            {
                await WriteSseAsync(context.Response, "done", new { done = true }, cancellationToken);
                return;
            }

            var chunk = JsonSerializer.Deserialize<OpenAiStreamChunk>(data, JsonOptions.Default);
            var content = chunk?.Choices?.FirstOrDefault()?.Delta?.Content;
            if (!string.IsNullOrEmpty(content))
            {
                await WriteSseAsync(context.Response, "token", new { content }, cancellationToken);
            }
        }
    }
    catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
    {
        await WriteSseAsync(context.Response, "error", new
        {
            error = "Cannot reach the managed local engine. Start it from Engine Setup first."
        }, cancellationToken);
    }
});



// Open browser automatically
_ = Task.Run(async () =>
{
    await Task.Delay(1500);

    Process.Start(new ProcessStartInfo
    {
        FileName = "http://127.0.0.1:5055",
        UseShellExecute = true
    });
});

_ = Task.Run(async () =>
{
    await Task.Delay(1000);

    try
    {
        titleRunner.Start();

        Console.WriteLine("Title generator started.");
    }
    catch (Exception ex)
    {
        Console.WriteLine(ex.Message);
    }
});

_ = Task.Run(async () =>
{
    await Task.Delay(2000);

    try
    {
        var config = LoadConfig();

        if (!string.IsNullOrWhiteSpace(config.ModelPath) &&
            File.Exists(config.ModelPath))
        {
            var port = engineRunner.GetOrAssignPort(
                config.ModelPath,
                config.Port
            );

            var result = engineRunner.StartModel(
                config,
                config.ModelPath,
                port
            );

            Console.WriteLine(
                $"Auto-start model: {result.Message}"
            );
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine(
            $"Auto-start failed: {ex.Message}"
        );
    }
});

_ = Task.Run(async () =>
{
    while (true)
    {
        await Task.Delay(10000);

        if (DateTime.UtcNow - lastPing >
            TimeSpan.FromSeconds(20))
        {
            Console.WriteLine("Browser disconnected. Closing application.");

            engineRunner.Stop();
            titleRunner.Stop();
            Environment.Exit(0);
        }
    }
});

app.MapPost("/api/title",
    async (
        TitleRequest request,
        TitleGeneratorService service) =>
{
    var title =
        await service.GenerateTitle(request.Text);

    return Results.Ok(
        new TitleResponse(title));
});


app.Run("http://127.0.0.1:5055");

// EngineConfig LoadConfig()
// {
//     if (!File.Exists(settingsPath))
//     {
//         var defaultConfig = EngineConfig.Default;
//         File.WriteAllText(settingsPath, JsonSerializer.Serialize(defaultConfig, JsonOptions.Indented));
//         return defaultConfig;
//     }

//     var json = File.ReadAllText(settingsPath);
//     return JsonSerializer.Deserialize<EngineConfig>(json, JsonOptions.Default) ?? EngineConfig.Default;
// }

//added new for published exe where engine is in subfolder

EngineConfig LoadConfig()
{
    if (!File.Exists(settingsPath))
    {
        var defaultConfig = EngineConfig.Default;
        File.WriteAllText(
            settingsPath,
            JsonSerializer.Serialize(defaultConfig, JsonOptions.Indented)
        );

        return defaultConfig;
    }

    var json = File.ReadAllText(settingsPath);

    var config =
        JsonSerializer.Deserialize<EngineConfig>(
            json,
            JsonOptions.Default
        ) ?? EngineConfig.Default;

    // If only filename is stored, convert it to full path
    if (!string.IsNullOrWhiteSpace(config.ModelPath) &&
        !Path.IsPathRooted(config.ModelPath))
    {
        config = config with
        {
            ModelPath = Path.Combine(
                AppContext.BaseDirectory,
                "Models",
                config.ModelPath
            )
        };
    }

    return config;
}


static Uri? GetLoopbackEndpoint(int port)
{
    var uri = new Uri($"http://127.0.0.1:{port}");
    return IPAddress.IsLoopback(IPAddress.Parse(uri.Host)) ? uri : null;
}

static ModelInfo CreateModelInfo(string path)
{
    var info = new FileInfo(path);
    return new ModelInfo(info.Name, info.FullName, info.Length, info.LastWriteTimeUtc);
}

static string MakeSafeFileName(string fileName)
{
    var invalid = Path.GetInvalidFileNameChars();
    var cleaned = new string(fileName.Select(ch => invalid.Contains(ch) ? '_' : ch).ToArray());
    return string.IsNullOrWhiteSpace(cleaned) ? $"model-{DateTimeOffset.UtcNow:yyyyMMddHHmmss}.gguf" : cleaned;
}

static async Task WriteSseAsync(HttpResponse response, string eventName, object payload, CancellationToken cancellationToken)
{
    await response.WriteAsync($"event: {eventName}\n", cancellationToken);
    await response.WriteAsync($"data: {JsonSerializer.Serialize(payload, JsonOptions.Default)}\n\n", cancellationToken);
    await response.Body.FlushAsync(cancellationToken);
}

static string FormatEngineError(string body)
{
    if (string.IsNullOrWhiteSpace(body))
    {
        return "The engine returned an empty error. Try lowering Context, starting a new chat, or restarting the engine.";
    }

    try
    {
        using var doc = JsonDocument.Parse(body);
        if (doc.RootElement.TryGetProperty("error", out var error))
        {
            if (error.ValueKind == JsonValueKind.String)
            {
                return error.GetString() ?? body;
            }

            if (error.TryGetProperty("message", out var message) && message.ValueKind == JsonValueKind.String)
            {
                return message.GetString() ?? body;
            }
        }
    }
    catch (JsonException)
    {
        // Return the raw text below.
    }

    return body.Length > 1200 ? $"{body[..1200]}..." : body;
}

public sealed class EngineRunner
{
    private readonly object syncRoot = new();
    private readonly Dictionary<string, RunningEngine> runningByModel = new(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<string, int> portByModel = new(StringComparer.OrdinalIgnoreCase);
    private int nextPort;

    public int GetOrAssignPort(string modelPath, int basePort)
    {
        lock (syncRoot)
        {
            var key = Path.GetFullPath(modelPath);

            if (portByModel.TryGetValue(key, out var existingPort))
            {
                return existingPort;
            }

            if (nextPort == 0)
            {
                nextPort = basePort;
            }

            var assigned = nextPort;
            nextPort++;

            portByModel[key] = assigned;
            return assigned;
        }
    }


public bool IsModelRunning(
    string modelPath,
    out int port)
{
    lock(syncRoot)
    {
        var key =
            Path.GetFullPath(modelPath);

        if (
            runningByModel.TryGetValue(
                key,
                out var engine
            ) &&
           (
    engine.Process == null ||
    !engine.Process.HasExited
)
        )
        {
            port = engine.Port;
            return true;
        }

        port = 0;
        return false;
    }
}



private int? FindRunningModelPort(string modelPath)
{
    var requested = Path.GetFileName(modelPath);

    for (int port = 8080; port <= 8100; port++)
    {
        try
        {
            using var client = new HttpClient();
            client.Timeout = TimeSpan.FromSeconds(1);

            var json = client
                .GetStringAsync($"http://127.0.0.1:{port}/v1/models")
                .GetAwaiter()
                .GetResult();

            var models =
                JsonSerializer.Deserialize<OpenAiModelsResponse>(json);

            var loaded =
                models?.Data?.FirstOrDefault()?.Id;

            if (string.Equals(
                    loaded,
                    requested,
                    StringComparison.OrdinalIgnoreCase))
            {
                return port;
            }
        }
        catch
        {
        }
    }

    return null;
}

    private bool TryAttachExistingServer(
    string modelPath,
    int port)
{
    try
    {
        using var client = new HttpClient();

        client.Timeout =
            TimeSpan.FromSeconds(2);

        var json =
            client.GetStringAsync(
                $"http://127.0.0.1:{port}/v1/models"
            ).GetAwaiter().GetResult();

        var models =
            JsonSerializer.Deserialize<
                OpenAiModelsResponse>(
                json
            );

        var loadedModel =
            models?.Data?
                .FirstOrDefault()?
                .Id;

        if (string.IsNullOrWhiteSpace(
                loadedModel))
        {
            return false;
        }

       var requestedModel =
    Path.GetFileName(
        modelPath
    );

if (!string.Equals(
        loadedModel,
        requestedModel,
        StringComparison.OrdinalIgnoreCase))
{
    return false;
}

        runningByModel[
            Path.GetFullPath(modelPath)
        ] =
            new RunningEngine(
                null,
                port,
                modelPath,
                "Attached to existing server"
            );

        Console.WriteLine(
            $"Attached to existing server on port {port}"
        );

        return true;
    }
    catch
    {
        return false;
    }
}

    public EngineStartResult StartModel(EngineConfig config, string modelPath, int port)
    {
        lock (syncRoot)
        {

            Console.WriteLine(
    $"START MODEL: {Path.GetFileName(modelPath)}"
);

            var key = Path.GetFullPath(modelPath);

            Console.WriteLine(
    $"START MODEL: {Path.GetFileName(modelPath)}"
);

            if (
    runningByModel.TryGetValue(
        key,
        out var existing
    ) &&
    (
        existing.Process == null ||
        !existing.Process.HasExited
    )
)
            {
                return new EngineStartResult(true, "Model already loaded.", JustStarted: false);
            }

            if (runningByModel.TryGetValue(key, out var stale))
            {
                stale.Process?.Dispose();
                runningByModel.Remove(key);
            }

            
   var existingPort =
    FindRunningModelPort(modelPath);

if (existingPort.HasValue)
{

    Console.WriteLine(
    $"REATTACHED {Path.GetFileName(modelPath)} ON PORT {existingPort.Value}"
);
    runningByModel[key] =
        new RunningEngine(
            null,
            existingPort.Value,
            modelPath,
            "Attached to existing server"
        );

    portByModel[key] =
        existingPort.Value;

    Console.WriteLine(
        $"REATTACHED {Path.GetFileName(modelPath)} ON PORT {existingPort.Value}"
    );

    return new EngineStartResult(
        true,
        $"Attached to existing server on port {existingPort.Value}",
        false
    );
}


// try
// {
//     using var client = new HttpClient();
//     client.Timeout = TimeSpan.FromSeconds(2);

//     var response = client
//         .GetAsync($"http://127.0.0.1:{port}/health")
//         .GetAwaiter()
//         .GetResult();

//     if (response.IsSuccessStatusCode)
//     {
//         return new EngineStartResult(
//             true,
//             $"Using existing server on port {port}.",
//             JustStarted: false
//         );
//     }
// }
// catch
// {
//     // Server not running, continue and start it
// }



// var enginePath = Path.Combine(
//     Directory.GetCurrentDirectory(),
//     "engine",
//     "llama-server.exe"
// );

//for published exe
var enginePath = Path.Combine(
    AppContext.BaseDirectory,
    "engine",
    "llama-server.exe"
);



if (!File.Exists(enginePath))
{
    return new EngineStartResult(
        false,
        $"Engine not found: {enginePath}",
        JustStarted: false
    );
}

            if (string.IsNullOrWhiteSpace(modelPath) || !File.Exists(modelPath))
            {
                return new EngineStartResult(false, "Choose a downloaded .gguf model file.", JustStarted: false);
            }

            var arguments = new[]
            {
                "--model", Quote(modelPath),
                "--host", "127.0.0.1",
                "--port", port.ToString(),
                "--ctx-size", config.ContextSize.ToString(),
                "--n-gpu-layers", config.GpuLayers.ToString(),
                "--parallel", "2"
            };

            var startInfo = new ProcessStartInfo
            {
                FileName = enginePath,
Arguments = string.Join(' ', arguments),
WorkingDirectory = Path.GetDirectoryName(enginePath) ?? Environment.CurrentDirectory,
                UseShellExecute = false,
                RedirectStandardError = true,
                RedirectStandardOutput = true,
                CreateNoWindow = true
            };

            var process = Process.Start(startInfo);
            if (process is null)
            {
                return new EngineStartResult(false, "Could not start the local engine process.", JustStarted: false);
            }

            process.OutputDataReceived += (_, args) => AppendLog(key, args.Data);
            process.ErrorDataReceived += (_, args) => AppendLog(key, args.Data);
            process.BeginOutputReadLine();
            process.BeginErrorReadLine();

            runningByModel[key] =
    new RunningEngine(
        process,
        port,
        key,
        ""
    );

            return new EngineStartResult(true, "Local engine started.", JustStarted: true);
        }
    }

    public void Stop()
    {
        lock (syncRoot)
        {
            foreach (var engine in runningByModel.Values)
            {
                if (engine.Process is { HasExited: false })
                {
                    engine.Process.Kill(entireProcessTree: true);
                }

                engine.Process?.Dispose();
            }

            runningByModel.Clear();
            portByModel.Clear();
        }
    }

    public void StopModel(string modelPath)
    {
        lock (syncRoot)
        {
            var key = Path.GetFullPath(modelPath);

            if (runningByModel.TryGetValue(key, out var engine))
            {
                if (engine.Process is { HasExited: false })
                {
                    engine.Process.Kill(entireProcessTree: true);
                }

                engine.Process?.Dispose();
                runningByModel.Remove(key);
            }
        }
    }

    public object GetStatus(EngineConfig config)
    {
        lock (syncRoot)
        {
            var entries = runningByModel.Select(kv => new
            {
                model = kv.Key,
                running = kv.Value.Process is { HasExited: false },
                pid = kv.Value.Process is { HasExited: false } ? kv.Value.Process.Id : null as int?,
                endpoint = $"http://127.0.0.1:{kv.Value.Port}",
                lastLog = kv.Value.LastLog
            }).ToList();

            return new
            {
                running = entries.Any(e => e.running),
                engines = entries
            };
        }
    }

    private void AppendLog(string key, string? line)
    {
        if (string.IsNullOrWhiteSpace(line))
        {
            return;
        }

        lock (syncRoot)
        {
            if (runningByModel.TryGetValue(key, out var engine))
            {
                var trimmed = line.Length > 600 ? line[^600..] : line;
                runningByModel[key] = engine with { LastLog = trimmed };
            }
        }
    }

    private static string Quote(string value)
    {
        return $"\"{value.Replace("\"", "\\\"")}\"";
    }
}

public sealed record RunningEngine(
    Process? Process,
    int Port,
    string ModelPath,
    string LastLog
);

public sealed record EngineConfig(
    string EnginePath,
    string ModelPath,
    int Port,
    int ContextSize,
    int GpuLayers)
{
    // public static EngineConfig Default => new(
    //     EnginePath: @"C:\llama.cpp\llama-server.exe",
    //     ModelPath: "",
    //     Port: 8080,
    //     ContextSize: 4096,
    //     GpuLayers: 0);

public static EngineConfig Default => new(
    EnginePath: Path.Combine(
        AppDomain.CurrentDomain.BaseDirectory,
        "engine",
        "llama-server.exe"
    ),
    ModelPath: "",
    Port: 8080,
    ContextSize: 14096,
    GpuLayers: 0
);
}
    
public sealed record EngineStartResult(bool Success, string Message, bool JustStarted = false);
public sealed record ModelInfo(string Name, string Path, long Size, DateTime ModifiedUtc);
public sealed record ModelDownloadRequest(string Url, string FileName);
public sealed record ChatRequest(ChatMessage[] Messages, double Temperature = 0.7, string ModelPath = "");
public sealed record ChatMessage(string Role, string Content);

public sealed record OpenAiChatRequest(
    [property: JsonPropertyName("model")] string Model,
    [property: JsonPropertyName("messages")] OpenAiMessage[] Messages,
    [property: JsonPropertyName("stream")] bool Stream,
    [property: JsonPropertyName("temperature")] double Temperature);

public sealed record OpenAiMessage(
    [property: JsonPropertyName("role")] string Role,
    [property: JsonPropertyName("content")] string Content);

public sealed record OpenAiStreamChunk(
    [property: JsonPropertyName("choices")] OpenAiChoice[]? Choices);

public sealed record OpenAiChoice(
    [property: JsonPropertyName("delta")] OpenAiDelta? Delta);

public sealed record OpenAiDelta(
    [property: JsonPropertyName("content")] string? Content);

    public sealed record OpenAiModelsResponse(
    [property: JsonPropertyName("data")]
    OpenAiModelInfo[] Data
);

public sealed record OpenAiModelInfo(
    [property: JsonPropertyName("id")]
    string Id
);

public static class JsonOptions
{
    public static readonly JsonSerializerOptions Default = new(JsonSerializerDefaults.Web);
    public static readonly JsonSerializerOptions Indented = new(JsonSerializerDefaults.Web) { WriteIndented = true };
}


