#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

/**
 * Converts seconds to HH:MM:SS format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Reads silence end times from file
 * @param {string} filePath - Path to silence_ends.txt
 * @returns {number[]} Array of silence end times in seconds
 */
function readSilenceEndTimes(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !isNaN(parseFloat(line)))
      .map((line) => parseFloat(line));
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    process.exit(1);
  }
}

/**
 * Gets audio duration using FFprobe
 * @param {string} inputFile - Path to input audio file
 * @returns {Promise<number>} Duration in seconds
 */
function getAudioDuration(inputFile) {
  return new Promise((resolve, reject) => {
    const command = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${inputFile}"`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Failed to get audio duration: ${error.message}`));
        return;
      }

      const duration = parseFloat(stdout.trim());
      if (isNaN(duration)) {
        reject(new Error("Could not parse audio duration"));
        return;
      }

      resolve(duration);
    });
  });
}

/**
 * Generates split points with minimum 5-minute intervals
 * @param {number[]} silenceEndTimes - Array of silence end times
 * @param {number} minIntervalMinutes - Minimum interval in minutes
 * @param {number} audioDuration - Total audio duration in seconds
 * @returns {number[]} Array of split points
 */
function generateSplitPoints(
  silenceEndTimes,
  minIntervalMinutes = 5,
  audioDuration = null
) {
  const minIntervalSeconds = minIntervalMinutes * 60;
  const splitPoints = [0]; // Start with 0
  let lastSplitTime = 0;

  for (const silenceEnd of silenceEndTimes) {
    // Check if this silence end time is at least minIntervalSeconds after the last split
    if (silenceEnd - lastSplitTime >= minIntervalSeconds) {
      splitPoints.push(silenceEnd);
      lastSplitTime = silenceEnd;
    }
  }

  // Add the end of audio as the final split point if we have duration info
  // and the last split point is not already at the end
  if (audioDuration && splitPoints[splitPoints.length - 1] < audioDuration) {
    splitPoints.push(audioDuration);
  }

  return splitPoints;
}

/**
 * Generates FFmpeg command for audio splitting
 * @param {string} inputFile - Input audio file path
 * @param {number[]} splitPoints - Array of split points in seconds
 * @param {string} outputPrefix - Prefix for output files
 * @returns {string} FFmpeg command
 */
function generateFFmpegCommand(
  inputFile,
  splitPoints,
  outputPrefix = "output_part"
) {
  if (splitPoints.length < 2) {
    console.log("No valid split points found. Audio will not be split.");
    return "";
  }

  let command = `ffmpeg -i ${inputFile}`;

  for (let i = 0; i < splitPoints.length - 1; i++) {
    const startTime = splitPoints[i];
    const endTime = splitPoints[i + 1];
    const partNumber = i + 1;
    const outputFile = `${outputPrefix}${partNumber}.mp3`;

    command += ` -ss ${formatTime(startTime)} -to ${formatTime(
      endTime
    )} -c copy ${outputFile}`;

    // Add line continuation for readability (except for the last segment)
    if (i < splitPoints.length - 2) {
      command += " \\\n";
    }
  }

  return command;
}

/**
 * Main function
 */
async function main() {
  const rawArgs = process.argv.slice(2);

  let isDryRun = false;
  let minIntervalMinutes = 5;
  let silenceFile = path.join(__dirname, "silence_ends.txt");
  const args = [];

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg === "--dry-run" || arg === "-n") {
      isDryRun = true;
      continue;
    }
    if (arg === "--min-interval" || arg === "-m") {
      const next = rawArgs[i + 1];
      if (!next || next.startsWith("-")) {
        console.error(
          "❌ Error: --min-interval/-m requires a number of minutes"
        );
        process.exit(1);
      }
      const minutes = parseInt(next, 10);
      if (isNaN(minutes) || minutes <= 0) {
        console.error(
          "❌ Error: --min-interval/-m must be a positive integer (minutes)"
        );
        process.exit(1);
      }
      minIntervalMinutes = minutes;
      i++; // skip value
      continue;
    }
    if (arg === "--silence-file" || arg === "-s") {
      const next = rawArgs[i + 1];
      if (!next || next.startsWith("-")) {
        console.error("❌ Error: --silence-file/-s requires a file path");
        process.exit(1);
      }
      silenceFile = next;
      i++; // skip value
      continue;
    }
    if (arg.startsWith("-")) {
      console.error(`❌ Error: Unknown option '${arg}'`);
      console.log(
        "Use --dry-run/-n, --min-interval/-m <minutes>, or --silence-file/-s <file>."
      );
      process.exit(1);
    }
    // positional
    args.push(arg);
  }

  if (args.length === 0) {
    console.log(
      "Usage: node audio-splitter.js <input-audio-file> [output-prefix] [options]"
    );
    console.log("Options:");
    console.log(
      "  --dry-run, -n                    Print FFmpeg command without executing"
    );
    console.log(
      "  --min-interval, -m <minutes>     Minimum interval in minutes (default: 5)"
    );
    console.log(
      "  --silence-file, -s <file>        Silence file path (default: silence_ends.txt)"
    );
    console.log("Example: node audio-splitter.js input.mp3 output_part");
    process.exit(1);
  }

  const inputFile = args[0];
  const outputPrefix = args[1] || "output_part";

  console.log(
    "🎵 Audio Splitter - Generating FFmpeg command based on silence detection"
  );
  console.log(`📁 Input file: ${inputFile}`);
  console.log(`📁 Silence file: ${silenceFile}`);
  console.log(`📁 Output prefix: ${outputPrefix}`);
  console.log(`⏱️  Minimum interval: ${minIntervalMinutes} minute(s)\n`);

  // Read silence end times
  const silenceEndTimes = readSilenceEndTimes(silenceFile);
  console.log(`📊 Found ${silenceEndTimes.length} silence end times`);

  // Get audio duration
  let audioDuration = null;
  try {
    console.log("🎵 Getting audio duration...");
    audioDuration = await getAudioDuration(inputFile);
    console.log(
      `⏱️  Audio duration: ${formatTime(
        audioDuration
      )} (${audioDuration.toFixed(2)}s)`
    );
  } catch (error) {
    console.log(`⚠️  Could not get audio duration: ${error.message}`);
    console.log("⚠️  Will not include final segment in output");
  }

  // Generate split points
  const splitPoints = generateSplitPoints(
    silenceEndTimes,
    minIntervalMinutes,
    audioDuration
  );
  console.log(
    `✂️  Generated ${splitPoints.length} split points:`,
    splitPoints.map((p) => `${formatTime(p)} (${p}s)`).join(", ")
  );

  // Generate FFmpeg command
  const ffmpegCommand = generateFFmpegCommand(
    inputFile,
    splitPoints,
    outputPrefix
  );

  if (ffmpegCommand) {
    if (isDryRun) {
      console.log("\n🚀 Generated FFmpeg command (dry run):\n");
      console.log(ffmpegCommand);
      console.log("\n💡 Copy and paste this command to split your audio file!");
      return;
    }

    console.log("\n▶️  Executing FFmpeg...\n");
    const child = exec(ffmpegCommand, (error, stdout, stderr) => {
      if (error) {
        console.error("❌ FFmpeg execution failed:", error.message);
        process.exitCode = 1;
        return;
      }
      // FFmpeg writes most logs to stderr
      if (stdout) {
        console.log(stdout);
      }
      if (stderr) {
        console.log(stderr);
      }
      console.log("\n✅ FFmpeg completed.");
    });
    // Forward child process output in real-time
    child.stdout && child.stdout.pipe(process.stdout);
    child.stderr && child.stderr.pipe(process.stdout);
  } else {
    console.log(
      "❌ No valid split points found. Check your silence_ends.txt file."
    );
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  formatTime,
  readSilenceEndTimes,
  getAudioDuration,
  generateSplitPoints,
  generateFFmpegCommand,
};
