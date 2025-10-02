function timecodeToMilliseconds(timecode) {
  const parts = timecode.split(":");
  const secondsAndMillis = parts[2].split(",");
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseInt(secondsAndMillis[0], 10);
  const milliseconds = parseInt(secondsAndMillis[1], 10);
  return (hours * 3600 + minutes * 60 + seconds) * 1000 + milliseconds;
}

function processSegments(segments, variables, errors, warnings) {
  let lastTimecodeLine = null;
  return segments.map((segment, index) => {
    // console.debug({ index, segment });

    const lines = segment.split("\n");
    const newIndex = index + 1;

    let timecodeLine = lines[1] || "";
    const originalTimecodeLine = timecodeLine;
    const content = lines.slice(2).join("\n");

    // Timecode validation
    const timecodeRegex =
      /\d{1,2}:\d{1,2}:\d{1,2},\d{3} --> \d{1,2}:\d{1,2}:\d{1,2},\d{3}/;
    if (!timecodeRegex.test(timecodeLine)) {
      const singleTimecodeRegex = /\d{1,2}:\d{1,2}:\d{1,2},\d{3}/;
      if (singleTimecodeRegex.test(timecodeLine.trim())) {
        if (index < segments.length - 1) {
          const nextSegmentLines = segments[index + 1].split("\n");
          const nextStartTime = nextSegmentLines[1].split(" --> ")[0];

          if (nextStartTime) {
            timecodeLine = `${timecodeLine.trim()} --> ${nextStartTime.trim()}`;
            warnings.push(
              `Segment ${newIndex}: Missing start or end time. Original: "${originalTimecodeLine}". Corrected to: "${timecodeLine}"`
            );
          } else {
            errors.push(
              `Segment ${newIndex}: Invalid timecode "${originalTimecodeLine}" and the next segment's timecode is also invalid.`
            );
          }
        } else {
          errors.push(
            `Segment ${newIndex}: Missing an end time and it's the last segment. Timecode: "${originalTimecodeLine}"`
          );
        }
      } else {
        errors.push(
          `Segment ${newIndex}: Invalid timecode format. Timecode: "${originalTimecodeLine}"`
        );
      }
    }

    const [startTime, endTime] = timecodeLine.split(" --> ");
    if (startTime && endTime) {
      const startTimeMs = timecodeToMilliseconds(startTime);
      const endTimeMs = timecodeToMilliseconds(endTime);

      if (startTimeMs >= endTimeMs) {
        errors.push(
          `Segment ${newIndex}: Invalid timecode (start >= end). Timecode: "${timecodeLine}"`
        );
      }

      if (lastTimecodeLine) {
        const prevEndTimeMs = timecodeToMilliseconds(
          lastTimecodeLine.split(" --> ")[1]
        );
        if (prevEndTimeMs > startTimeMs) {
          warnings.push(
            `Segment ${newIndex}: Overlaps with the previous segment. Previous end time: ${
              lastTimecodeLine.split(" --> ")[1]
            }, current start time: ${startTime}`
          );
        }
      }
    }

    lastTimecodeLine = timecodeLine;

    return {
      index: newIndex,
      timecode: timecodeLine,
      content: content,
    };
  });
}

function processSrt(data, variables = null) {
  const errors = [];
  const warnings = [];
  let newVariablesCount = 0;
  let substitutedCount = 0;
  let unhandledVariablesCount = 0;

  const segments = data
    .replace(/\r\n/g, "\n")
    .split(/\n\n+/)
    .map((segment) => segment.trim());
  const filteredSegments = segments.filter((segment) => segment);

  const processedSegments = processSegments(
    filteredSegments,
    variables,
    errors,
    warnings
  );

  if (variables) {
    processedSegments.forEach((segment) => {
      const newContent = segment.content.replace(
        /{{([^}]+)}}/g,
        (match, variableName) => {
          if (variables.hasOwnProperty(variableName)) {
            // if variable is empty, don't replace it.
            if (!variables[variableName]) {
              unhandledVariablesCount++;
              return match;
            }

            substitutedCount++;
            return variables[variableName];
          }

          newVariablesCount++;
          unhandledVariablesCount++;
          variables[variableName] = "";
          return match;
        }
      );
      segment.content = newContent;
    });
  }

  const outputContent = processedSegments
    .map(
      (segment) => `${segment.index}\n${segment.timecode}\n${segment.content}`
    )
    .join("\n\n");

  return {
    outputContent,
    errors,
    warnings,
    newVariablesCount,
    substitutedCount,
    unhandledVariablesCount,
    variables,
  };
}

module.exports = { processSrt, timecodeToMilliseconds, processSegments };
