using System.Text.Json;
using System.Diagnostics;
using Whisper.net;

static Dictionary<string, string?> ParseArgs(string[] args)
{
    var map = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
    for (int i = 0; i < args.Length; i++)
    {
        var a = args[i];
        if (a.StartsWith("--"))
        {
            var key = a;
            string? val = null;
            if (i + 1 < args.Length && !args[i + 1].StartsWith("--"))
            {
                val = args[i + 1];
                i++;
            }
            map[key] = val;
        }
    }
    return map;
}

static WhisperProcessorBuilder QualityBuilder(WhisperFactory factory, string lang, string? prompt)
{
    var builder = factory.CreateBuilder()
        .WithLanguage(lang)
        .WithThreads(Environment.ProcessorCount)
        .WithProbabilities()
        .WithNoSpeechThreshold(0.4f)
        .WithTemperature(0.0f);
    if (!string.IsNullOrWhiteSpace(prompt))
    {
        builder = builder.WithPrompt(prompt);
    }
    return builder;
}

static async Task<byte[]> ReadExactlyAsync(Stream stream, int count)
{
    var buffer = new byte[count];
    int totalRead = 0;
    while (totalRead < count)
    {
        int read = await stream.ReadAsync(buffer, totalRead, count - totalRead);
        if (read == 0)
            throw new EndOfStreamException("Unexpected end of stream");
        totalRead += read;
    }
    return buffer;
}

var dict = ParseArgs(args);

var isServerMode = dict.ContainsKey("--server");

if (isServerMode)
{
    if (!dict.TryGetValue("--model", out var modelPath) || string.IsNullOrWhiteSpace(modelPath))
    {
        Console.Error.WriteLine("Server mode requires --model argument");
        return 1;
    }

    var lang = dict.TryGetValue("--language", out var l) && !string.IsNullOrWhiteSpace(l) ? l! : "en";

    try
    {
        Console.Error.WriteLine($"[Sidecar] Starting server mode: model={modelPath} lang={lang} threads={Environment.ProcessorCount}");

        var stdin = Console.OpenStandardInput();
        var stdout = Console.OpenStandardOutput();
        var stdinReader = new StreamReader(stdin);
        var utf8NoBom = new System.Text.UTF8Encoding(false);
        var stdoutWriter = new StreamWriter(stdout, utf8NoBom, bufferSize: 1) { AutoFlush = true };

        var tModel = Stopwatch.StartNew();
        using var factory = WhisperFactory.FromPath(modelPath!);
        tModel.Stop();
        Console.Error.WriteLine($"[Sidecar] Model loaded in server mode: {tModel.Elapsed}");

        string currentPrompt = "";
        var processor = QualityBuilder(factory, lang, null).Build();

        await stdoutWriter.WriteLineAsync("{\"ready\":true}");
        await stdoutWriter.FlushAsync();
        stdout.Flush();

        Console.Error.WriteLine("[Sidecar] Server ready, waiting for requests...");

        while (true)
        {
            try
            {
                var line = await stdinReader.ReadLineAsync();
                if (string.IsNullOrEmpty(line))
                {
                    Console.Error.WriteLine("[Sidecar] Client disconnected (empty line)");
                    break;
                }

                string filePath;
                string prompt = "";
                var trimmed = line.Trim();
                if (trimmed.StartsWith('{'))
                {
                    using var doc = JsonDocument.Parse(trimmed);
                    filePath = doc.RootElement.GetProperty("path").GetString() ?? "";
                    if (doc.RootElement.TryGetProperty("prompt", out var promptEl))
                    {
                        prompt = promptEl.GetString() ?? "";
                    }
                }
                else
                {
                    filePath = trimmed;
                }

                if (!File.Exists(filePath))
                {
                    Console.Error.WriteLine($"[Sidecar] File not found: {filePath}");
                    await stdoutWriter.WriteLineAsync("{\"text\": \"\", \"error\": \"File not found\"}");
                    continue;
                }

                if (!string.Equals(prompt, currentPrompt, StringComparison.Ordinal))
                {
                    processor.Dispose();
                    currentPrompt = prompt;
                    processor = QualityBuilder(factory, lang, string.IsNullOrWhiteSpace(prompt) ? null : prompt).Build();
                    Console.Error.WriteLine($"[Sidecar] Rebuilt processor (prompt {currentPrompt.Length} chars)");
                }

                using var fileStream = File.OpenRead(filePath);
                var segments = new List<string>();
                await foreach (var result in processor.ProcessAsync(fileStream))
                {
                    if (!string.IsNullOrWhiteSpace(result.Text))
                    {
                        segments.Add(result.Text);
                    }
                }

                var text = string.Join(" ", segments).Trim();
                var json = JsonSerializer.Serialize(new { text }, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
                await stdoutWriter.WriteLineAsync(json);
                await stdoutWriter.FlushAsync();
                stdout.Flush();
                Console.Error.WriteLine($"[Sidecar] Transcript {text.Length} chars");
            }
            catch (EndOfStreamException)
            {
                Console.Error.WriteLine("[Sidecar] Client disconnected, shutting down server");
                break;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[Sidecar] Request processing error: {ex}");
                try
                {
                    var errJson = JsonSerializer.Serialize(new { error = ex.Message });
                    await stdoutWriter.WriteLineAsync(errJson);
                    await stdoutWriter.FlushAsync();
                    stdout.Flush();
                }
                catch { /* ignore secondary errors */ }
            }
        }

        processor.Dispose();
        Console.Error.WriteLine("[Sidecar] Server mode shutdown");
        return 0;
    }
    catch (Exception ex)
    {
        Console.Error.WriteLine($"[Sidecar] Server mode error: {ex}");
        try
        {
            var stdout = Console.OpenStandardOutput();
            var utf8NoBom = new System.Text.UTF8Encoding(false);
            using var stdoutWriter = new StreamWriter(stdout, utf8NoBom, bufferSize: 1) { AutoFlush = true };
            var errJson = JsonSerializer.Serialize(new { error = $"Server startup error: {ex.Message}" });
            stdoutWriter.WriteLine(errJson);
            stdout.Flush();
        }
        catch { /* ignore secondary errors */ }
        return 1;
    }
}

var tTotal = Stopwatch.StartNew();
if (!dict.TryGetValue("--model", out var oneShotModel) || string.IsNullOrWhiteSpace(oneShotModel) ||
    !dict.TryGetValue("--input", out var inputPath) || string.IsNullOrWhiteSpace(inputPath))
{
    Console.Error.WriteLine("Missing required args --model and/or --input");
    return 1;
}

var oneShotLang = dict.TryGetValue("--language", out var oneShotLangRaw) && !string.IsNullOrWhiteSpace(oneShotLangRaw) ? oneShotLangRaw! : "en";
var promptArg = dict.TryGetValue("--prompt", out var p) ? p : null;

try
{
    Console.Error.WriteLine($"[Sidecar] Args: model={oneShotModel} input={inputPath} lang={oneShotLang} threads={Environment.ProcessorCount}");

    using var factory = WhisperFactory.FromPath(oneShotModel!);
    using var processor = QualityBuilder(factory, oneShotLang, promptArg).Build();

    Stream audio;
    if (inputPath == "-")
    {
        var stdin = Console.OpenStandardInput();
        var ms = new MemoryStream();
        await stdin.CopyToAsync(ms);
        ms.Position = 0;
        audio = ms;
    }
    else
    {
        audio = File.OpenRead(inputPath!);
    }

    var segments = new List<string>();
    await foreach (var result in processor.ProcessAsync(audio))
    {
        if (!string.IsNullOrWhiteSpace(result.Text))
        {
            segments.Add(result.Text);
        }
    }

    var text = string.Join(" ", segments).Trim();
    var json = JsonSerializer.Serialize(new { text }, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
    Console.Out.WriteLine(json);
    Console.Error.WriteLine($"[Sidecar] Total elapsed: {tTotal.Elapsed}");
    return 0;
}
catch (Exception ex)
{
    Console.Error.WriteLine(ex.ToString());
    return 1;
}
