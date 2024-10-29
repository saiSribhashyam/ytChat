import express from "express";
import getYtinfo from "./methods/getYtInfo.js";
import getTranscript from "./methods/getTranscript.js";
import askQuestion from "./methods/chatbot.js";
import dotenv from "dotenv";
import cors from "cors";
import { v4 as uuidv4 } from 'uuid';
import rateLimit from "express-rate-limit";
import helmet from "helmet";

dotenv.config();

const app = express();

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - Origin: ${req.headers.origin}`);
  next();
});

// Security middleware with adjusted helmet configuration
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" }
}));

// Basic middleware
app.use(express.json({ limit: '10mb' }));

// CORS configuration
const allowedOrigins = ['https://ytchatfr.vercel.app', 'http://localhost:3000', 'http://127.0.0.1:5500'];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`Blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// const corsOptions = {
//   origin: 'https://ytchatfr.vercel.app', // Replace with your frontend domain
//   methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
//   credentials: true,
//   optionsSuccessStatus: 204
// };

// app.use(cors(corsOptions));

// // Pre-flight requests handling
// app.options('*', cors(corsOptions));
// Pre-flight requests handling
app.options('*', cors());

// In-memory storage for chat sessions
const chatSessions = new Map();

// Cleanup inactive sessions every hour
setInterval(() => {
  const now = Date.now();
  for (const [chatId, session] of chatSessions.entries()) {
    if (now - session.lastActive > 3600000) { // 1 hour
      chatSessions.delete(chatId);
      console.log(`Cleaned up inactive session: ${chatId}`);
    }
  }
}, 3600000);

// Rate limiting configuration
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: { message: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(apiLimiter);

// Debug endpoint
app.get("/debug", (req, res) => {
  res.json({
    environment: process.env.NODE_ENV,
    allowedOrigins,
    currentOrigin: req.headers.origin,
    timestamp: new Date().toISOString(),
    activeSessions: chatSessions.size
  });
});

// Health Check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    activeSessions: chatSessions.size,
    environment: process.env.NODE_ENV
  });
});

// Start chat endpoint
app.post("/startchat", async (req, res) => {
  try {
    const { urlAddress } = req.body;

    if (!urlAddress) {
      return res.status(400).json({ message: "urlAddress is required." });
    }

    console.log(`Starting chat for URL: ${urlAddress}`);

    const vifo = await getYtinfo(urlAddress);
    const [vidinfo, author] = vifo;

    if (!vidinfo?.id) {
      return res.status(400).json({ message: "Invalid YouTube URL or unable to fetch video info." });
    }

    const transcript = await getTranscript(vidinfo.id);
    if (!transcript) {
      return res.status(400).json({ message: "Unable to fetch transcript for the video." });
    }

    const chatId = uuidv4();
    chatSessions.set(chatId, {
      vidinfo,
      transcript,
      author,
      history: [],
      messageCount: 0,
      maxMessages: parseInt(process.env.MAX_MESSAGES || '15'),
      lastActive: Date.now(),
      createdAt: new Date().toISOString()
    });

    console.log(`Chat session created: ${chatId}`);

    res.status(200).json({ 
      message: "Chat session initialized.",
      chatId,
      info: vidinfo,
      trans: transcript 
    });
  } catch (err) {
   // const x=await getYtinfo("https://www.youtube.com/watch?v=qD1U0D_MiH4")
    console.error("StartChat Error:", err);
    res.status(500).json({ 
      error: process.env.NODE_ENV === 'production' 
        ? "Unable to start chat session" 
        : err.message,
      requestId: uuidv4()
    });
  }
});

// Chat route endpoint
app.post("/chatroute", async (req, res) => {
  try {
    const { chatId, message } = req.body;

    if (!chatId || !message) {
      return res.status(400).json({ message: "chatId and message are required." });
    }

    const session = chatSessions.get(chatId);
    if (!session) {
      return res.status(400).json({ message: "Invalid chatId or session has ended." });
    }

    if (session.messageCount >= session.maxMessages) {
      return res.status(429).json({ message: "Message limit reached for this chat session." });
    }

    console.log(`Processing message for chat: ${chatId}`);
    const responseMessage = await askQuestion(session, message);
    
    session.history.push({ 
      sender: "user", 
      message, 
      timestamp: new Date().toISOString() 
    });
    session.history.push({ 
      sender: "AI", 
      message: responseMessage, 
      timestamp: new Date().toISOString() 
    });
    session.messageCount += 2;
    session.lastActive = Date.now();

    res.status(200).json({ response: responseMessage });
  } catch (err) {
    console.error("Chat Route Error:", err);
    res.status(500).json({ 
      error: process.env.NODE_ENV === 'production' 
        ? "Unable to process message" 
        : err.message,
      requestId: uuidv4()
    });
  }
});

// End chat endpoint
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

    const chatHistory = session.history;
    chatSessions.delete(chatId);

    console.log(`Chat session ended: ${chatId}`);

    res.status(200).json({ 
      message: "Chat session ended successfully.",
      history: chatHistory
    });
  } catch (err) {
    console.error("EndChat Error:", err);
    res.status(500).json({ 
      error: process.env.NODE_ENV === 'production' 
        ? "Unable to end chat session" 
        : err.message,
      requestId: uuidv4()
    });
  }
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Error details:', {
    timestamp: new Date().toISOString(),
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    origin: req.headers.origin
  });

  res.status(err.status || 500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    requestId: uuidv4()
  });
});

// Server startup
const PORT = process.env.PORT || 8000;
const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log('Allowed origins:', allowedOrigins);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('Received SIGTERM. Performing graceful shutdown...');
  chatSessions.clear();
  server.close(() => {
    console.log('Server closed. Process terminating...');
    process.exit(0);
  });
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  server.close(() => {
    process.exit(1);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, but log the event
});