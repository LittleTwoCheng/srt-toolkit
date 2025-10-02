#!/usr/bin/env node

const { exec } = require("child_process");
const fs = require("fs");

/**
 * Executes FFmpeg silence detection and saves results to file
 * @param {string} inputFile - Path to input audio file
 * @param {string} outputFile - Path to output file for silence end times
 * @param {number} noiseThreshold - Noise threshold in dB (default: -45)
 * @param {number} minDuration - Minimum silence duration in seconds (default: 0.5)
 * @returns {Promise<void>}
 */
function detectSilence(
  inputFile,
  outputFile,
  noiseThreshold = -45,
  minDuration = 0.5
) {
  return new Promise((resolve, reject) => {
    const command = `ffmpeg -i "${inputFile}" -af silencedetect=n=${noiseThreshold}dB:d=${minDuration} -f null - 2>&1 | grep "silence_end" | awk '{print $5}' > "${outputFile}"`;

    console.log(`🎵 Silence Detection - Analyzing audio file`);
    console.log(`📁 Input file: ${inputFile}`);
    console.log(`📁 Output file: ${outputFile}`);
    console.log(`🔊 Noise threshold: ${noiseThreshold} dB`);
    console.log(`⏱️  Minimum duration: ${minDuration} seconds`);
    console.log(`\n▶️  Executing FFmpeg...\n`);

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error("❌ FFmpeg execution failed:", error.message);
        reject(error);
        return;
      }

      // Check if output file was created and has content
      try {
        if (fs.existsSync(outputFile)) {
          const content = fs.readFileSync(outputFile, "utf8");
          const silenceTimes = content
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line && !isNaN(parseFloat(line)))
            .map((line) => parseFloat(line));

          console.log(`✅ Silence detection completed!`);
          console.log(`📊 Found ${silenceTimes.length} silence end times`);
          console.log(`📁 Results saved to: ${outputFile}`);

          if (silenceTimes.length > 0) {
            console.log(`\n📋 Silence end times (first 10):`);
            silenceTimes.slice(0, 10).forEach((time, index) => {
              const minutes = Math.floor(time / 60);
              const seconds = (time % 60).toFixed(2);
              console.log(
                `  ${index + 1}. ${time}s (${minutes}:${seconds.padStart(
                  5,
                  "0"
                )})`
              );
            });
            if (silenceTimes.length > 10) {
              console.log(`  ... and ${silenceTimes.length - 10} more`);
            }
          }
        } else {
          console.log(
            "⚠️  No output file created. Check if FFmpeg found any silence periods."
          );
        }
      } catch (fileError) {
        console.error("❌ Error reading output file:", fileError.message);
        reject(fileError);
        return;
      }

      resolve();
    });
  });
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: node silence-detector.js <input-audio-file> [options]");
    console.log("");
    console.log("Options:");
    console.log(
      "  --output, -o <file>     Output file for silence end times (default: silence_ends.txt)"
    );
    console.log(
      "  --threshold, -t <dB>    Noise threshold in dB (default: -45)"
    );
    console.log(
      "  --duration, -d <sec>    Minimum silence duration in seconds (default: 0.5)"
    );
    console.log("");
    console.log("Examples:");
    console.log("  node silence-detector.js input.mp3");
    console.log(
      "  node silence-detector.js input.mp3 -o my_silence.txt -t -40 -d 1.0"
    );
    console.log(
      "  node silence-detector.js input.mp3 --output silence.txt --threshold -50 --duration 0.3"
    );
    process.exit(1);
  }

  const inputFile = args[0];
  let outputFile = "silence_ends.txt";
  let noiseThreshold = -45;
  let minDuration = 0.5;

  // Parse command line arguments
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case "--output":
      case "-o":
        if (nextArg && !nextArg.startsWith("-")) {
          outputFile = nextArg;
          i++; // Skip next argument
        } else {
          console.error("❌ Error: --output/-o requires a filename");
          process.exit(1);
        }
        break;
      case "--threshold":
      case "-t":
        if (nextArg && nextArg.startsWith("-")) {
          const threshold = parseFloat(nextArg);
          if (isNaN(threshold)) {
            console.error("❌ Error: --threshold/-t requires a valid number");
            process.exit(1);
          }
          noiseThreshold = threshold;
          i++; // Skip next argument
        } else {
          console.error("❌ Error: --threshold/-t requires a number");
          process.exit(1);
        }
        break;
      case "--duration":
      case "-d":
        if (nextArg && !nextArg.startsWith("-")) {
          const duration = parseFloat(nextArg);
          if (isNaN(duration) || duration <= 0) {
            console.error("❌ Error: --duration/-d requires a positive number");
            process.exit(1);
          }
          minDuration = duration;
          i++; // Skip next argument
        } else {
          console.error("❌ Error: --duration/-d requires a positive number");
          process.exit(1);
        }
        break;
      default:
        console.error(`❌ Error: Unknown option '${arg}'`);
        console.log("Use --help or no arguments to see usage information.");
        process.exit(1);
    }
  }

  // Validate input file exists
  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Error: Input file '${inputFile}' does not exist`);
    process.exit(1);
  }

  try {
    await detectSilence(inputFile, outputFile, noiseThreshold, minDuration);
  } catch (error) {
    console.error("❌ Silence detection failed:", error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  detectSilence,
};
