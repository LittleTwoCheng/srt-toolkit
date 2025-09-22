const { processSrt } = require("./srt-processor");

describe("SRT Toolkit", () => {
  test("should correctly parse a valid SRT file", () => {
    const srtData = `1
00:00:01,000 --> 00:00:03,000
Hello, world!`;
    const { outputContent, errors, warnings } = processSrt(srtData);
    expect(errors.length).toBe(0);
    expect(warnings.length).toBe(0);
    expect(outputContent).toBe(srtData);
  });

  test("should handle invalid timecodes (start >= end)", () => {
    const srtData = `1
00:00:03,000 --> 00:00:01,000
Invalid timecode.`;
    const { errors } = processSrt(srtData);
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain("Invalid timecode (start >= end)");
  });

  test("should handle single-digit time components", () => {
    const srtData = `1
0:1:5,000 --> 0:1:10,500
Valid timecode.`;
    const { errors } = processSrt(srtData);
    expect(errors.length).toBe(0);
  });

  test("should correctly substitute variables with Unicode characters", () => {
    const srtData = `1
00:00:01,000 --> 00:00:03,000
欢迎来到{{小茅棚}}！`;
    const variables = { 小茅棚: "我的世界" };
    const { outputContent } = processSrt(srtData, variables);
    expect(outputContent).toContain("欢迎来到我的世界！");
  });

  test("should add new variables to the variables object", () => {
    const srtData = `1
00:00:01,000 --> 00:00:03,000
Hello, {{user}}!`;
    const variables = {};
    const { newVariablesCount, variables: updatedVariables } = processSrt(
      srtData,
      variables
    );
    expect(newVariablesCount).toBe(1);
    expect(updatedVariables).toHaveProperty("user", "");
  });
});
