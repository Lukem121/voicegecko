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

static async Task WriteInt32Async(Stream stream, int value)
{
    var bytes = BitConverter.GetBytes(value);
    if (!BitConverter.IsLittleEndian)
        Array.Reverse(bytes);
    await stream.WriteAsync(bytes);
    await stream.FlushAsync(); // Ensure immediate write
}

static async Task<int> ReadInt32Async(Stream stream)
{
    var bytes = await ReadExactlyAsync(stream, 4);
    if (!BitConverter.IsLittleEndian)
        Array.Reverse(bytes);
    return BitConverter.ToInt32(bytes);
}

var dict = ParseArgs(args);

// Check for server mode
var isServerMode = dict.ContainsKey("--server");

if (isServerMode)
{
    // Server mode: persistent process that handles multiple requests
    if (!dict.TryGetValue("--model", out var modelPath) || string.IsNullOrWhiteSpace(modelPath))
    {
        Console.Error.WriteLine("Server mode requires --model argument");
        return 1;
    }

    var lang = dict.TryGetValue("--language", out var l) && !string.IsNullOrWhiteSpace(l) ? l! : "en";
    
    try
    {
        Console.Error.WriteLine($"[Sidecar] Starting server mode: model={modelPath} lang={lang} threads={Environment.ProcessorCount}");

        // Load model once
        var tModel = Stopwatch.StartNew();
        using var factory = WhisperFactory.FromPath(modelPath!);
        tModel.Stop();
        Console.Error.WriteLine($"[Sidecar] Model loaded in server mode: {tModel.Elapsed}");

        // Build processor once with optimized settings
        var tBuild = Stopwatch.StartNew();
        var builder = factory.CreateBuilder()
            .WithLanguage(lang)
            .WithThreads(Environment.ProcessorCount)
            .WithProbabilities() // Better accuracy
            .WithNoSpeechThreshold(0.6f) // Skip silent parts - major speedup
            .WithTemperature(0.0f); // Greedy decoding for speed and consistency
        using var processor = builder.Build();
        tBuild.Stop();
        Console.Error.WriteLine($"[Sidecar] Processor built in server mode: {tBuild.Elapsed}");

        Console.Error.WriteLine("[Sidecar] Server ready, waiting for requests...");

        var stdin = Console.OpenStandardInput();
        var stdout = Console.OpenStandardOutput();

        var stdinReader = new StreamReader(stdin);
        var utf8NoBom = new System.Text.UTF8Encoding(false); // No BOM
        var stdoutWriter = new StreamWriter(stdout, utf8NoBom, bufferSize: 1) { AutoFlush = true };

        while (true)
        {
            try
            {
                // Simple line-based protocol: read file path, send JSON response
                var tRequest = Stopwatch.StartNew();
                var tIPC = Stopwatch.StartNew();
                
                var filePath = await stdinReader.ReadLineAsync();
                if (string.IsNullOrEmpty(filePath))
                {
                    Console.Error.WriteLine("[Sidecar] Client disconnected (empty line)");
                    break;
                }
                
                tIPC.Stop();
                Console.Error.WriteLine($"[Sidecar] 📥 IPC read took: {tIPC.Elapsed} | file: {Path.GetFileName(filePath)}");

                if (!File.Exists(filePath))
                {
                    Console.Error.WriteLine($"[Sidecar] ❌ File not found: {filePath}");
                    await stdoutWriter.WriteLineAsync("{\"text\": \"\", \"error\": \"File not found\"}");
                    continue;
                }

                // Detailed file processing breakdown
                var tFileOpen = Stopwatch.StartNew();
                using var fileStream = File.OpenRead(filePath);
                var fileInfo = new FileInfo(filePath);
                tFileOpen.Stop();
                Console.Error.WriteLine($"[Sidecar] 📂 File open took: {tFileOpen.Elapsed} | size: {fileInfo.Length} bytes");

                var tProcessTotal = Stopwatch.StartNew();
                var segments = new List<string>();
                var segmentCount = 0;
                var tFirstSegment = Stopwatch.StartNew();
                var firstSegmentReceived = false;
                
                Console.Error.WriteLine($"[Sidecar] 🎵 Starting ProcessAsync...");
                await foreach (var result in processor.ProcessAsync(fileStream))
                {
                    if (!firstSegmentReceived)
                    {
                        tFirstSegment.Stop();
                        Console.Error.WriteLine($"[Sidecar] ⚡ First segment took: {tFirstSegment.Elapsed}");
                        firstSegmentReceived = true;
                    }
                    
                    segmentCount++;
                    if (!string.IsNullOrWhiteSpace(result.Text))
                    {
                        segments.Add(result.Text);
                        Console.Error.WriteLine($"[Sidecar] 📝 Segment {segmentCount}: \"{result.Text.Trim()}\" (confidence: {result.Probability:F3})");
                    }
                }
                
                tProcessTotal.Stop();
                var text = string.Join(" ", segments).Trim();
                Console.Error.WriteLine($"[Sidecar] 🎯 ProcessAsync complete: {tProcessTotal.Elapsed} | segments: {segments.Count}/{segmentCount}");

                // Send response as single JSON line
                var tResponse = Stopwatch.StartNew();
                var payload = new { text };
                var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
                
                await stdoutWriter.WriteLineAsync(json);
                await stdoutWriter.FlushAsync();
                stdout.Flush(); // Force OS-level flush
                tResponse.Stop();

                tRequest.Stop();
                Console.Error.WriteLine($"[Sidecar] 📤 Response sent: {tResponse.Elapsed} | json: {json.Length}b");
                Console.Error.WriteLine($"[Sidecar] 🏁 TOTAL REQUEST: {tRequest.Elapsed} | result: \"{text}\"");
            }
            catch (EndOfStreamException)
            {
                Console.Error.WriteLine("[Sidecar] Client disconnected, shutting down server");
                break;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[Sidecar] Request processing error: {ex}");
                // Continue processing other requests
            }
        }

        Console.Error.WriteLine("[Sidecar] Server mode shutdown");
        return 0;
    }
    catch (Exception ex)
    {
        Console.Error.WriteLine($"[Sidecar] Server mode error: {ex}");
        return 1;
    }
}
else
{
    // Legacy single-shot mode for backward compatibility
    var tTotal = Stopwatch.StartNew();
    if (!dict.TryGetValue("--model", out var modelPath) || string.IsNullOrWhiteSpace(modelPath) ||
        !dict.TryGetValue("--input", out var inputPath) || string.IsNullOrWhiteSpace(inputPath))
    {
        Console.Error.WriteLine("Missing required args --model and/or --input");
        return 1;
    }

    var lang = dict.TryGetValue("--language", out var l) && !string.IsNullOrWhiteSpace(l) ? l! : "en";
    var prompt = dict.TryGetValue("--prompt", out var p) ? p : null;

    try
    {
        Console.Error.WriteLine($"[Sidecar] Args: model={modelPath} input={inputPath} lang={lang} threads={Environment.ProcessorCount}");

        var tModel = Stopwatch.StartNew();
        using var factory = WhisperFactory.FromPath(modelPath!);
        tModel.Stop();
        Console.Error.WriteLine($"[Sidecar] Model load: {tModel.Elapsed}");

        var tBuild = Stopwatch.StartNew();
        var builder = factory.CreateBuilder()
            .WithLanguage(lang)
            .WithThreads(Environment.ProcessorCount)
            .WithProbabilities() // Better accuracy
            .WithNoSpeechThreshold(0.6f) // Skip silent parts - major speedup
            .WithTemperature(0.0f); // Greedy decoding for speed and consistency
        using var processor = builder.Build();
        tBuild.Stop();
        Console.Error.WriteLine($"[Sidecar] Processor build: {tBuild.Elapsed}");

        Stream audio;
        var tInput = Stopwatch.StartNew();
        if (inputPath == "-")
        {
            var stdin = Console.OpenStandardInput();
            var ms = new MemoryStream();
            await stdin.CopyToAsync(ms);
            ms.Position = 0;
            audio = ms;
            Console.Error.WriteLine($"[Sidecar] 📥 Buffered stdin: {ms.Length} bytes in {tInput.Elapsed}");
        }
        else
        {
            var fs = File.OpenRead(inputPath!);
            var fileInfo = new FileInfo(inputPath!);
            audio = fs;
            Console.Error.WriteLine($"[Sidecar] 📂 Opened file: {fileInfo.Length} bytes in {tInput.Elapsed}");
        }

        var segments = new List<string>();
        var tProcess = Stopwatch.StartNew();
        var segmentCount = 0;
        var tFirst = Stopwatch.StartNew();
        var firstSegmentReceived = false;
        
        Console.Error.WriteLine($"[Sidecar] 🎵 Starting ProcessAsync (simple mode)...");
        await foreach (var result in processor.ProcessAsync(audio))
        {
            if (!firstSegmentReceived)
            {
                tFirst.Stop();
                Console.Error.WriteLine($"[Sidecar] ⚡ First segment took: {tFirst.Elapsed}");
                firstSegmentReceived = true;
            }
            
            segmentCount++;
            if (!string.IsNullOrWhiteSpace(result.Text))
            {
                segments.Add(result.Text);
                Console.Error.WriteLine($"[Sidecar] 📝 Segment {segmentCount}: \"{result.Text.Trim()}\" (confidence: {result.Probability:F3})");
            }
        }
        tProcess.Stop();
        Console.Error.WriteLine($"[Sidecar] 🎯 ProcessAsync complete: {tProcess.Elapsed} | segments: {segments.Count}/{segmentCount}");

        var text = string.Join(" ", segments).Trim();
        var payload = new { text };
        var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        Console.Out.WriteLine(json);
        Console.Error.WriteLine($"[Sidecar] Total elapsed: {tTotal.Elapsed}");
        return 0;
    }
    catch (Exception ex)
    {
        Console.Error.WriteLine(ex.ToString());
        return 1;
    }
}


