# SRT Formatter CLI Tool (`srt-toolkit`)

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
