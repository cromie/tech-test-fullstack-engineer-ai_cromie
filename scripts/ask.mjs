// Ask the chat endpoint one question and print the streamed answer plus tool calls.
// Usage: node scripts/ask.mjs "How many games are rated above 4?" [base_url]
const [question, base = "http://localhost:3000"] = process.argv.slice(2);
const res = await fetch(`${base}/api/chat`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ messages: [{ id: "1", role: "user", parts: [{ type: "text", text: question }] }] }),
});
if (!res.ok) {
  console.error(res.status, await res.text());
  process.exit(1);
}
const decoder = new TextDecoder();
let buffer = "";
for await (const chunk of res.body) {
  buffer += decoder.decode(chunk, { stream: true });
  const lines = buffer.split("\n");
  buffer = lines.pop();
  for (const line of lines) {
    if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
    const event = JSON.parse(line.slice(6));
    if (event.type === "text-delta") process.stdout.write(event.delta);
    if (event.type === "tool-input-available") console.log(`\n[tool] ${event.toolName} ${JSON.stringify(event.input)}`);
    if (event.type === "error") console.log(`\n[error] ${event.errorText}`);
  }
}
console.log();
