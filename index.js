import "dotenv/config";
import express from "express";
import multer from "multer";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";

const app = express();
const upload = multer();

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

const GEMINI_MODEL = "gemini-2.5-flash-lite";

app.use(express.json());

const PORT = 3000;
app.listen(PORT, () => console.log(`Server ready on http://localhost:${PORT}`));

app.post("/generate-text", async (req, res) => {
  const { theme } = req.body; // misalnya: "cinta sedih"

  const prompt = `
Buat lirik lagu Mandarin dengan tema: ${theme}

FORMAT WAJIB JSON seperti ini:

{
  "title": "",
  "sections": [
    {
      "type": "verse",
      "lines": [
        {
          "chinese": "",
          "pinyin": "",
          "english": "",
          "indonesian": "",
          "start": 0,
          "end": 3.5
        }
      ]
    }
  ]
}

Gunakan pinyin dengan tone mark.
JANGAN beri penjelasan tambahan, hanya JSON.
`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    let text = response.text;
    text = text.replace(/```json/g, "").replace(/```/g, "");

    const json = JSON.parse(text);

    res.setHeader("Content-Type", "application/json");

    res.status(200).send(
      JSON.stringify(
        {
          success: true,
          data: json,
          readable: formatLyricsReadableV4(json),
          readable2: formatLyricsChineseOnly(json),
          suno: formatLyricsForSunoAdvanced(json),
        },
        null,
        2,
      ),
    );
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: e.message });
  }
});

function formatLyricsReadableV4(data) {
  let result = "";

  data.sections.forEach((section, index) => {
    result += `\n[${section.type.toUpperCase()}]\n`;

    section.lines.forEach((line) => {
      const time = `${line.start.toFixed(2).padStart(5, "0")} - ${line.end.toFixed(2).padStart(5, "0")}`;

      result += `${time} | ${line.chinese}\n`;
      result += `       | ${line.pinyin}\n`;
      result += `       | EN: ${line.english}\n`;
      result += `       | ID: ${line.indonesian}\n\n`;
    });

    // spasi antar section (lebih minimal)
    if (index !== data.sections.length - 1) {
      result += "\n";
    }
  });

  return result.trim();
}

function formatLyricsReadableV3(data) {
  let result = "";

  data.sections.forEach((section, i) => {
    // HEADER SECTION
    result += `\n━━━━━━━━━━ ${section.type.toUpperCase()} ━━━━━━━━━━\n\n`;

    section.lines.forEach((line) => {
      const start = line.start.toFixed(2).padStart(6, " ");
      const end = line.end.toFixed(2).padStart(6, " ");

      result += `⏱ ${start} → ${end}\n`;
      result += `中: ${line.chinese}\n`;
      result += `拼: ${line.pinyin}\n`;
      result += `EN: ${line.english}\n`;
      result += `ID: ${line.indonesian}\n`;
      result += `\n`;
    });

    // jarak antar section (tidak terlalu jauh)
    if (i !== data.sections.length - 1) {
      result += `────────────────────────────────────\n`;
    }
  });

  return result.trim();
}

function formatLyricsChineseOnly(data) {
  let result = "";

  data.sections.forEach((section) => {
    section.lines.forEach((line) => {
      result += `${line.chinese}\n`;
    });

    result += "\n";
  });

  return result
    .replace(/\n{2,}/g, "\n\n") // max 2 newline
    .trim();
}

function formatLyricsForSunoAdvanced(data) {
  let result = "";

  data.sections.forEach((section) => {
    result += `[${section.type.toUpperCase()}]\n`;

    section.lines.forEach((line) => {
      result += `${line.chinese}\n`;
    });

    result += "\n";
  });

  return result.trim();
}

app.post("/generate-from-image", upload.single("image"), async (req, res) => {
  const { prompt } = req.body;
  const base64Image = req.file.buffer.toString("base64");

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { text: prompt, type: "text" },
        { inlineData: { data: base64Image, mimeType: req.file.mimetype } },
      ],
    });
    res.status(200).json({ result: response.text });
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: message });
  }
});

app.post(
  "/generate-from-document",
  upload.single("document"),
  async (req, res) => {
    const { prompt } = req.body;
    const base64Document = req.file.buffer.toString("base64");

    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            text: prompt ?? "Tolong buat ringkasan dari dokumen berikut.",
            type: "text",
          },
          { inlineData: { data: base64Document, mimeType: req.file.mimetype } },
        ],
      });
      res.status(200).json({ result: response.text });
    } catch (e) {
      console.log(e);
      res.status(500).json({ message: message });
    }
  },
);

app.post("/generate-from-audio", upload.single("audio"), async (req, res) => {
  const { prompt } = req.body;
  const base64Audio = req.file.buffer.toString("base64");

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          text: prompt ?? "Tolong buat transkrip dari rekaman berikut.",
          type: "text",
        },
        { inlineData: { data: base64Audio, mimeType: req.file.mimetype } },
      ],
    });
    res.status(200).json({ result: response.text });
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: message });
  }
});
