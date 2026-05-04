import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GOOGLE_GEMINI_API_KEY) {
  throw new Error(
    "GOOGLE_GEMINI_API_KEY must be set. Did you forget to provision the Google Gemini AI integration?",
  );
}

export const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
});

export const geminiSearchModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  tools: [
    {
      googleSearchRetrieval: {},
    },
  ],
});
