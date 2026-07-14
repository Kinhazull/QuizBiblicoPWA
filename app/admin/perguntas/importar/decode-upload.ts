const mojibakePattern = /(?:Ã.|Â.|â.|�)/g;

function corruptionScore(value: string) {
  return (value.match(mojibakePattern) || []).length;
}

function repairUtf8Mojibake(value: string) {
  if (!/[ÃÂâ]/.test(value)) return value;
  try {
    const bytes = Uint8Array.from(value, character => {
      const code = character.charCodeAt(0);
      if (code > 255) throw new Error("not_latin1");
      return code;
    });
    const repaired = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return corruptionScore(repaired) < corruptionScore(value) ? repaired : value;
  } catch {
    return value;
  }
}

export function decodeQuestionUpload(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    // O Excel no Windows frequentemente salva CSV como ANSI/Windows-1252.
    text = new TextDecoder("windows-1252").decode(bytes);
  }
  return repairUtf8Mojibake(text.replace(/^\uFEFF/, ""));
}
