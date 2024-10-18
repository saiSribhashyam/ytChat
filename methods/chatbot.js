import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory, HarmProbability } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
   
   
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    
  ];

// Function to chat using Gemini API
// Function to chat using Gemini API

const authorToString = async (videInfo) => {
    try {
        const author = videInfo.vidinfo.author;
        const authorString = "Author: " + author.name+"\nsubscribers: "+author.subscriber_count+"\n channel url:"+author.channel_url;
        return authorString;
    } catch (err) {
        console.error("Error during author to string conversion:", err);
        return { error: "Something went wrong while processing the author." };
    }
}
const askQuestion = async (videInfo, question) => {
    try {
        // Initialize the Gemini API client with the provided API key
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" , safetySettings});
        const authorString= await authorToString(videInfo);
        console.log(authorString)
        // Start a chat with the initial context of the transcript
        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: "Here is the video transcript: " + videInfo.transcript +"\n the title: "+videInfo.vidinfo.title + "\n description of the video: "+videInfo.vidinfo.description + "\nAuthor :"+ authorString
                     }],
                },
                {
                    role: "user",  // Ensure the role is 'user' for the initial context
                    parts: [{ text: "What would you like to ask about the video?" }],
                },
            ],
        });

        // Send the user's question to Gemini
        const result = await chat.sendMessage(question);
        const responseText = await result.response.text();

        // Get and return the response
        return responseText;
    } catch (err) {
        console.error("Error during Gemini chat:", err);
        return { error: "Something went wrong while processing the question." };
    }
};


export default askQuestion;
