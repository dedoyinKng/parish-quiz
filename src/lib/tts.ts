export const VOICES = [
  { id: "en-NG-AbeoNeural", label: "Nigerian English · male (Abeo)" },
  { id: "en-NG-EzinneNeural", label: "Nigerian English · female (Ezinne)" },
  { id: "en-GB-RyanNeural", label: "British English · male (Ryan)" },
  { id: "en-GB-LibbyNeural", label: "British English · female (Libby)" },
];
export const DEFAULT_VOICE = VOICES[0].id;

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Spelling Bee reading: the word (slowly), the sentence if there is one,
 * then the word again.
 */
export async function synthesize(
  word: string,
  sentence: string | null,
  voice: string
) {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region) {
    throw new Error("AZURE_SPEECH_KEY and AZURE_SPEECH_REGION are not set in .env");
  }
  if (!VOICES.some((v) => v.id === voice)) throw new Error("Unknown voice");

  const lang = voice.slice(0, 5);
  const w = esc(word);
  const body =
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}">` +
    `<voice name="${voice}">` +
    `<prosody rate="-15%">${w}</prosody>` +
    `<break time="900ms"/>` +
    (sentence ? `<prosody rate="-5%">${esc(sentence)}</prosody><break time="900ms"/>` : "") +
    `<prosody rate="-15%">${w}</prosody>` +
    `</voice></speak>`;

  const res = await fetch(
    `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
    {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3",
        "User-Agent": "quiz-competitions",
      },
      body,
    }
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Speech service said ${res.status}. ${t.slice(0, 120)}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}
