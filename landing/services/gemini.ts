
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const organizeFilesWithAI = async (filesList: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Organize this messy list of files into a clean folder structure: ${filesList}. Group them logically (e.g., Documents, Images, Code, Invoices).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              folder: { type: Type.STRING, description: "Name of the logical category" },
              files: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of files in this category" }
            },
            required: ["folder", "files"]
          }
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Categorization Error:", error);
    return null;
  }
};

