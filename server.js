import express from "express";
import getYtinfo from "./methods/getYtInfo.js";
import getTranscript from "./methods/getTranscript.js";
import askQuestion from "./methods/chatbot.js";
import dotenv from "dotenv";
import cors from "cors";
import { v4 as uuidv4 } from 'uuid';
import rateLimit from "express-rate-limit";

dotenv.config();

const app = express();

app.use(express.json());

app.use(cors());

// In-memory storage for chat sessions
const chatSessions = new Map();

// Rate Limiting Middleware
const apiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { message: "Too many requests from this IP, please try again after 15 minutes." },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply the rate limiting middleware to all requests
app.use(apiLimiter);

// Health Check Endpoint
app.get("/", (req, res) => {
  res.status(200).json({ message: "Server is working" });
});

// Start chat and retrieve video information
app.post("/startchat", async (req, res) => {
  try {
    const { urlAddress } = req.body;

    if (!urlAddress) {
      return res.status(400).json({ message: "urlAddress is required." });
    }

    console.log(`Initializing chat with urlAddress: ${urlAddress}`);

    const vifo = await getYtinfo(urlAddress);
    const vidinfo = vifo[0];
    const author=vifo[1];
    if (!vidinfo || !vidinfo.id) {
      return res.status(400).json({ message: "Invalid YouTube URL or unable to fetch video info." });
    }

    const transcript = await getTranscript(vidinfo.id);
    if (!transcript) {
      return res.status(400).json({ message: "Unable to fetch transcript for the video." });
    }

    // Generate a unique chat ID
    const chatId = uuidv4();

    // Initialize chat session with message count
    chatSessions.set(chatId, {
      vidinfo,
      transcript,
      author,
      history: [], // To store chat history
      messageCount: 0, // Initialize message count
      maxMessages: 15 // Set a maximum number of messages per session
    });

    console.log(`Chat session started with ID: ${chatId}`);
    console.log("Video info retrieved: ", vidinfo);

    res.status(200).json({ 
      message: "Chat session initialized.",
      chatId, // Return the chat ID to the client
      info: vidinfo,
      trans: transcript 
    });
  } catch (err) {
    console.error("StartChat Error:", err);
    res.status(500).json({ error: "Something went wrong while initializing the chat session." });
  }
});

// Chat route to handle messages
app.post("/chatroute", async (req, res) => {
  try {
    const { chatId, message } = req.body;

    if (!chatId) {
      return res.status(400).json({ message: "chatId is required." });
    }

    if (!message) {
      return res.status(400).json({ message: "Message is required." });
    }

    const session = chatSessions.get(chatId);
    if (!session) {
      return res.status(400).json({ message: "Invalid chatId or session has ended." });
    }

    // Check if the session has reached the maximum number of messages
    if (session.messageCount >= session.maxMessages) {
      return res.status(429).json({ message: "Message limit reached for this chat session." });
    }

    console.log(`Message from user [Chat ID: ${chatId}]: ${message}`);

    // Pass the message as a string instead of an object
    const responseMessage = await askQuestion(session, message);

    // Update session history and message count
    session.history.push({ sender: "user", message });
    session.history.push({ sender: "AI", message: responseMessage });
    session.messageCount += 2; // Increment by 2 for user and AI messages

    res.status(200).json({ response: responseMessage });
  } catch (err) {
    console.error("Chat Route Error:", err);
    res.status(500).json({ error: "Something went wrong while processing the chat." });
  }
});

// End chat and return chat history
app.post("/endchat", (req, res) => {
  try {
    const { chatId } = req.body;

    if (!chatId) {
      return res.status(400).json({ message: "chatId is required." });
    }

    const session = chatSessions.get(chatId);
    if (!session) {
      return res.status(400).json({ message: "Invalid chatId or session has already ended." });
    }

    // Retrieve chat history
    const chatHistory = session.history;

    // Remove the session from active chats
    chatSessions.delete(chatId);

    res.status(200).json({ 
      message: "Chat session ended successfully.",
      history: chatHistory // Send history to client for local storage
    });
  } catch (err) {
    console.error("EndChat Error:", err);
    res.status(500).json({ error: "Something went wrong while ending the chat session." });
  }
});

// Optional: Endpoint to get chat history (requires authentication in production)
app.get("/chathistory", (req, res) => {
  // Implement authentication and retrieval of chat histories if needed
  res.status(501).json({ message: "Not Implemented." });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
