const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
if (!apiKey) {
  console.log("NO KEY FOUND IN PROCESS ENV");
  process.exit(1);
}
console.log("key present, length:", apiKey.length);

async function main() {
  const fs = await import("fs");
  const buffer = fs.readFileSync("/tmp/test1.jpg");
  const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        {
          image: { content: buffer.toString("base64") },
          features: [{ type: "CROP_HINTS" }, { type: "OBJECT_LOCALIZATION" }],
        },
      ],
    }),
  });
  const json: any = await res.json();
  if (json.error) {
    console.log("VISION ERROR:", json.error);
    return;
  }
  const r = json.responses[0];
  console.log("CROP HINTS:", JSON.stringify(r.cropHintsAnnotation?.cropHints ?? [], null, 2));
  console.log("OBJECT LOCALIZATION:", JSON.stringify(r.localizedObjectAnnotations ?? [], null, 2));
}
main();
