using System.Diagnostics;
using System.Text;
using System.Text.Json;
using System.Net;

public sealed class TitleGeneratorRunner
{
    private Process? process;

    public int Port => 8095;

    public bool Start()
{
    if (process != null && !process.HasExited)
        return true;

    if (IsTitleServerRunning())
    {
        Console.WriteLine("Title server already running.");
        startedByThisApp = false;
        return true;
    }

    var enginePath = Path.Combine(
        AppContext.BaseDirectory,
        "engine",
        "llama-server.exe");

    var modelPath = Path.Combine(
        AppContext.BaseDirectory,
        "TitleGenerator",
        "ttls.apa");

    if (!File.Exists(enginePath))
        throw new FileNotFoundException(enginePath);

    if (!File.Exists(modelPath))
        throw new FileNotFoundException(modelPath);

    process = Process.Start(new ProcessStartInfo
    {
        FileName = enginePath,
        Arguments =
            $"--model \"{modelPath}\" " +
            $"--host 127.0.0.1 " +
            $"--port {Port} " +
            "--ctx-size 2048 " +
            "--parallel 1",

        WorkingDirectory = Path.GetDirectoryName(enginePath)!,
        UseShellExecute = false,
        RedirectStandardOutput = true,
        RedirectStandardError = true,
        CreateNoWindow = true
    });

    if (process != null)
    {
        startedByThisApp = true;

        process.EnableRaisingEvents = true;

        process.Exited += (_, _) =>
        {
            process?.Dispose();
            process = null;
            startedByThisApp = false;
        };
    }

    return process != null;
}

    public void Stop()
{
    if (!startedByThisApp)
        return;

    try
    {
        if (process != null && !process.HasExited)
        {
            process.Kill(true);
            process.WaitForExit();
        }
    }
    catch
    {
    }
    finally
    {
        process?.Dispose();
        process = null;
        startedByThisApp = false;
    }
}



    private bool IsTitleServerRunning()
{
    try
    {
        using var client = new HttpClient();
        client.Timeout = TimeSpan.FromSeconds(2);

        var json = client
            .GetStringAsync($"http://127.0.0.1:{Port}/v1/models")
            .GetAwaiter()
            .GetResult();

        using var doc = JsonDocument.Parse(json);

        var id = doc.RootElement
            .GetProperty("data")[0]
            .GetProperty("id")
            .GetString();

        return string.Equals(
            id,
            "ttls",
            StringComparison.OrdinalIgnoreCase);
    }
    catch
    {
        return false;
    }
}

private bool startedByThisApp;

}

public sealed class TitleGeneratorService
{
    private readonly IHttpClientFactory httpFactory;
    private readonly TitleGeneratorRunner runner;

    public TitleGeneratorService(
        IHttpClientFactory httpFactory,
        TitleGeneratorRunner runner)
    {
        this.httpFactory = httpFactory;
        this.runner = runner;
    }

    public async Task<string> GenerateTitle(string text)
{
    runner.Start();

    using var client = httpFactory.CreateClient();

var prompt =
$"""
You are a title generator.

Generate ONE short title.

Rules:
- Maximum 6 words.
- Output ONLY the title.
- Do NOT say "Here's the title".
- Do NOT explain.
- Do NOT use quotes.
- Do NOT use bullet points.
- Do NOT include any other text.

Conversation:

{text}
""";

    var request = new
    {
        model = "ttls",
        stream = false,
        temperature = 0.2,
        messages = new object[]
{
    new
    {
        role = "system",
        content =
@"You generate concise conversation titles.

Return ONLY the title.
Never explain.
Never use quotes.
Maximum 6 words."
    },

    new
    {
        role = "user",
        content = text
    }
}
    };

    var response = await client.PostAsync(
        "http://127.0.0.1:8095/v1/chat/completions",
        new StringContent(
            JsonSerializer.Serialize(request),
            Encoding.UTF8,
            "application/json"));

    response.EnsureSuccessStatusCode();

    var json =
        await response.Content.ReadAsStringAsync();

    using var doc =
        JsonDocument.Parse(json);

    var title = doc.RootElement
    .GetProperty("choices")[0]
    .GetProperty("message")
    .GetProperty("content")
    .GetString()?
    .Trim() ?? "";

title = title
    .Replace("**", "")
    .Replace("\"", "")
    .Replace("Here's the title:", "", StringComparison.OrdinalIgnoreCase)
    .Replace("Here's a short title:", "", StringComparison.OrdinalIgnoreCase)
    .Replace("Title:", "", StringComparison.OrdinalIgnoreCase)
    .Trim();

return title;
}
}

public sealed record TitleRequest(string Text);

public sealed record TitleResponse(string Title);