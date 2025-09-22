#!/usr/bin/env node

const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const fs = require("fs");
const path = require("path");
const { processSrt } = require("./srt-processor");
const chalk = require("chalk");
const error = chalk.bold.red;
const warning = chalk.keyword("orange");

const argv = yargs(hideBin(process.argv))
  .usage("Usage: $0 <input-file.srt> [options]")
  .demandCommand(1, "You must provide an input SRT file.")
  .option("variables", {
    alias: "v",
    type: "string",
    description: "Path to a JSON file containing variable definitions",
  })
  .option("output", {
    alias: "o",
    type: "string",
    description: "Path for the formatted output file",
  })
  .help()
  .alias("help", "h").argv;

const inputFile = argv._[0];
let variables = null;

try {
  const data = fs.readFileSync(inputFile, "utf8");

  if (argv.variables) {
    try {
      const variablesPath = path.resolve(argv.variables);
      if (fs.existsSync(variablesPath)) {
        const variablesData = fs.readFileSync(variablesPath, "utf8");
        variables = JSON.parse(variablesData);
      } else {
        variables = {};
      }
    } catch (err) {
      console.error("Error reading variables file:", err.message);
      process.exit(1);
    }
  }

  const {
    outputContent,
    errors,
    warnings,
    newVariablesCount,
    substitutedCount,
    unhandledVariablesCount,
    variables: updatedVariables,
  } = processSrt(data, variables);

  const outputFile = argv.output || inputFile;

  fs.writeFileSync(outputFile, outputContent);
  console.log(`Formatted SRT file saved to ${outputFile}`);

  if (argv.variables) {
    const variablesPath = path.resolve(argv.variables);
    fs.writeFileSync(variablesPath, JSON.stringify(updatedVariables, null, 2));
    console.log(`Updated variables file saved to ${variablesPath}`);
    console.log(
      `Substituted ${substitutedCount} variables. Added ${newVariablesCount} new variables to JSON.`
    );

    if (unhandledVariablesCount > 0) {
      console.log(
        `\n${warning(
          "Warnings:"
        )} there is unhandled variable placeholder in the output.`
      );
    }
  }

  console.log(`\nProcessed ${outputContent.split("\n\n").length} segments.`);
  if (errors.length > 0) {
    console.log(`\n${error("Errors:")}`);
    errors.forEach((error) => console.log(`- ${error}`));
  }
  if (warnings.length > 0) {
    console.log(`\n${warning("Warnings:")}`);
    warnings.forEach((warning) => console.log(`- ${warning}`));
  }
} catch (err) {
  console.error("Error:", err.message);
  process.exit(1);
}
