// mp4 first: Chrome records it natively now and it plays/edits everywhere,
// webm is the fallback for browsers that can't.
export function pickRecordingMimeType(): string {
  const candidates = ["video/mp4", "video/webm;codecs=vp9", "video/webm"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

export function extensionForMimeType(type: string): "mp4" | "webm" {
  return type.includes("mp4") ? "mp4" : "webm";
}

export function triggerDownload(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
}
