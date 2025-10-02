# 🎞️ 💬 SRT Formatter CLI Tool (`srt-toolkit`)

This is a Node.js command-line tool to validate, format, and process template variables in SubRip Subtitle (`.srt`) files.

## Features

- **SRT Validation and Auto-Formatting**:
  - Automatically re-numbers segments sequentially.
  - Validates timecode format (`HH:MM:SS,mmm --> HH:MM:SS,mmm`).
  - Checks for logical time errors (start time >= end time).
  - Detects and warns about overlapping segments.
  - Auto-fixes segments with a missing end time by using the start time of the next segment.
- **Variable Processing**:
  - Finds and replaces template variables (e.g., `{{variable_name}}`) using a provided JSON file.
  - Supports Unicode characters in variable names.
  - Automatically discovers new variables in the SRT file and adds them to the JSON file for future use.

## Usage

```bash
node srt-toolkit.js <input-file.srt> [--variables <variable-file.json>] [--output <output-file.srt>]
```

### Arguments

- `input-file.srt`: (Required) The path to the source SRT file.
- `--variables`, `-v`: (Optional) Path to a JSON file containing variable definitions. If provided, variable processing is enabled.
- `--output`, `-o`: (Optional) Path for the formatted output file. If this is not provided, the tool will overwrite the input file.

## Example

Given the following files:

**`input.srt`**:

```
12
00:01:10,500 --> 00:01:13,000
Hello, {{user}}! Welcome to {{location}}.

6
00:01:15,000
This is a test subtitle.

2
00:01:16,500 --> 00:01:10,000
This timecode is invalid.
```

**`vars.json`**:

```json
{
  "user": "Alice"
}
```

### Command

```bash
node srt-toolkit.js input.srt -v vars.json -o formatted.srt
```

### Console Output

```
Formatted SRT file saved to formatted.srt
Updated variables file saved to /path/to/your/project/vars.json
Substituted 1 variables. Added 1 new variables to JSON.

Processed 3 segments.

Errors:
- Segment 3 has an invalid timecode (start >= end).

Warnings:
- Segment 2 was missing a start or end time. Used previous segment's end time and next segment's start time.
```

### Resulting Files

**`formatted.srt`**:

```
1
00:01:10,500 --> 00:01:13,000
Hello, Alice! Welcome to {{location}}.

2
00:01:13,000 --> 00:01:16,500
This is a test subtitle.

3
00:01:16,500 --> 00:01:10,000
This timecode is invalid.
```

**`vars.json` (Updated)**:

```json
{
  "user": "Alice",
  "location": "location"
}
```

## Testing

This project uses [Jest](https://jestjs.io/) for unit testing. To run the tests, follow these steps:

1.  **Install dependencies:**
    If you haven't already, install the necessary development dependencies.

    ```bash
    npm install
    ```

2.  **Run tests:**
    Execute the test suite with the following command:
    ```bash
    npm test
    ```

The tests will run, and you will see the output in your console, indicating whether all tests passed or if any of them failed.

# 🔎 🤫 Utility - Silence Detector CLI Tool (`silence-detector`)

Detect silence periods in audio files using FFmpeg and save the silence end times to a text file.

## Requirements

- **FFmpeg**: Must be installed and available in the system PATH
  - Download from [https://ffmpeg.org/download.html](https://ffmpeg.org/download.html)
  - Verify installation: `ffmpeg -version`

## Features

- Detects silence periods in audio files using FFmpeg's silencedetect filter
- Configurable noise threshold and minimum silence duration
- Saves silence end times to a text file for use with other tools
- Real-time progress feedback during processing

## Usage

```bash
node silence-detector.js <input-audio-file> [options]
```

### Arguments

- `input-audio-file`: (Required) Path to the input audio file (e.g., `input.mp3`)

### Options

- `--output`, `-o <file>`: Output file for silence end times (default: `silence_ends.txt`)
- `--threshold`, `-t <dB>`: Noise threshold in dB (default: `-45`)
- `--duration`, `-d <sec>`: Minimum silence duration in seconds (default: `0.5`)

## Examples

```bash
# Basic usage with default settings
node silence-detector.js input.mp3

# Custom output file and settings
node silence-detector.js input.mp3 -o my_silence.txt -t -40 -d 1.0

# More sensitive detection (lower threshold, shorter duration)
node silence-detector.js input.mp3 --output silence.txt --threshold -50 --duration 0.3
```

## Output

The script will:

1. Analyze the audio file for silence periods
2. Save silence end times (in seconds) to the specified output file
3. Display a summary of detected silence periods
4. Show the first 10 silence end times with formatted timestamps

Example output:

```
🎵 Silence Detection - Analyzing audio file
📁 Input file: input.mp3
📁 Output file: silence_ends.txt
🔊 Noise threshold: -45 dB
⏱️  Minimum silence duration: 0.5 seconds

▶️  Executing FFmpeg...

✅ Silence detection completed!
📊 Found 24 silence end times
📁 Results saved to: silence_ends.txt

📋 Silence end times (first 10):
  1. 101.913146s (1:41.91)
  2. 106.800729s (1:46.80)
  3. 154.706042s (2:34.71)
  ...
```

## NPM Script

You can also use the npm script:

```bash
npm run detect input.mp3
```

# ✂️ 📣 Utility - Audio Splitter CLI Tool (`audio-splitter`)

Automatically generate FFmpeg commands to split audio files based on silence detection with minimum interval requirements.

## Requirements

- **FFmpeg**: Must be installed and available in the system PATH
  - Download from [https://ffmpeg.org/download.html](https://ffmpeg.org/download.html)
  - or install it using Homebrew on macOS
  - Verify installation: `ffmpeg -version`

## Features

- Reads silence end times from `silence_end.txt`
- Ensures minimum 5-minute intervals between splits
- Generates properly formatted FFmpeg commands
- Supports any audio format that FFmpeg can handle

## Usage

```bash
node audio-splitter.js <input-audio-file> [output-prefix] [--dry-run|-n] [--min-interval|-m <minutes>]
```

### Arguments

- `input-audio-file`: (Required) Path to the input audio file (e.g., `input.mp3`)
- `output-prefix`: (Optional) Prefix for output files (default: `output_part`)
- `--dry-run`, `-n`: (Optional) Print the FFmpeg command without executing it
  — `--min-interval`, `-m <minutes>`: (Optional) Minimum interval in minutes (default: 5)

## Example

```bash
node audio-splitter.js input.mp3 my_audio_part
```

This will generate an FFmpeg command that splits `input.mp3` into multiple files with the prefix `my_audio_part1.mp3`, `my_audio_part2.mp3`, etc. Add `--dry-run` to preview the command without running FFmpeg.

## Output

The script will output a ready-to-use FFmpeg command like:

```bash
ffmpeg -i input.mp3 -ss 00:00:00 -to 00:09:35 -c copy output_part1.mp3 \
 -ss 00:09:35 -to 00:16:06 -c copy output_part2.mp3 \
 -ss 00:16:06 -to 00:21:09 -c copy output_part3.mp3 \
 -ss 00:21:09 -to 00:39:20 -c copy output_part4.mp3
```

## NPM Script

You can also use the npm script:

```bash
npm run split input.mp3
```

# Utility - Other FFmpeg useful commands

Useful FFmpeg commands for audio and video processing:

Add subtitle to the video

```bash
ffmpeg -i input.mp4 -vf subtitles=subtitle.srt output_srt.mp4
```

Add soft subtitle
(good for quick testing)

```bash
ffmpeg -i input.mp4 -i subtitle.srt -c copy -c:s mov_text -metadata:s:s:0 language=chi ouptut_chi.mp4
```

Convert video into audio

```bash
ffmpeg -i input.mp4  output_audio.mp3
```

find all silent moment in audio, dump the end time(second) to `silence_end.txt`

```bash
ffmpeg -i output_audio.mp3 -af silencedetect=n=-45dB:d=0.5 -f null - 2>&1 | grep "silence_end" | awk '{print $5}' > silence_end.txt
```

`n=-45dB`noise tolerance level (audio below this level is considered silent) (in dB)
`d=0.5` minimum duration of silence to be detected (in seconds)

```bash
ffmpeg -i output.mp3 -ss 00:00:00 -to 00:05:00 -c copy output_part1.mp3 \
-ss 00:05:00 -to 00:10:00 -c copy output_part2.mp3
```

We can add more -ss, -to, and output file combinations to split the audio into as many custom segments as required.
