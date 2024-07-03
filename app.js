import { v2 as cloudinary } from "cloudinary";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { v4 as uuid } from "uuid";
import { corsOptions } from "./constant/config.js";
import {
  CHAT_JOINED,
  CHAT_LEAVED,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  ONLINE_USERS,
  START_TYPING,
  STOP_TYPING,
} from "./constant/event.js";
import { getSockets } from "./lib/helper.js";
import { socketAuthenticator } from "./middlewares/auth.js";
import { errorMiddleware } from "./middlewares/error.js";
import { Message } from "./models/message.js";
import { connectDB } from "./utils/features.js";

import adminRoute from "./routes/admin.js";
import chatRoute from "./routes/chat.js";
import userRoute from "./routes/user.js";

dotenv.config({
  path: "./.env",
});

const mongoURI = process.env.MONGO_URI;
const port = process.env.PORT || 3000;
// const envMode = process.env.NODE_ENV.trim() || "PRODUCTION";
const adminSecretKey = process.env.ADMIN_SECRET_KEY || "bhaskar123";

// ye line current connect user ke kiye hai ki current time main kitne user soket.io pe connect hai 
const userSocketIDs = new Map();
const onlineUsers = new Set();

connectDB(mongoURI);


// connect to cloudinary for save images
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

app.set("io", io);

// Using Middlewares Here
app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));

app.use("/api/v1/user", userRoute);
app.use("/api/v1/chat", chatRoute);
app.use("/api/v1/admin", adminRoute);

app.get("/", (req, res) => {
  res.send("Hello World");
});

// io.use((socket, next) => {
//   cookieParser()(
//     socket.request,
//     socket.request.res,
//     async (err) => await socketAuthenticator(err, socket, next)
//   );
// });

// io.on("connection", (socket) => {
//   const user = socket.user;
//   userSocketIDs.set(user._id.toString(), socket.id);


//   // yaha pr frontend se data milega 
//   socket.on(NEW_MESSAGE, async ({ chatId, members, message }) => {
//     const messageForRealTime = {
//       content: message,
//       _id: uuid(),
//       sender: {
//         _id: user._id,
//         name: user.name,
//       },
//       chat: chatId,
//       createdAt: new Date().toISOString(),
//     };

//     // this Object for res to save message save to database
//     const messageForDB = {
//       content: message,
//       sender: user._id,
//       chat: chatId,
//     };

//     const membersSocket = getSockets(members);
//     // this line res for send sms to currect chat id and the message 
//     io.to(membersSocket).emit(NEW_MESSAGE, {
//       chatId,
//       message: messageForRealTime, // real time send message
//     });
//     io.to(membersSocket).emit(NEW_MESSAGE_ALERT, { chatId });

//     try {
//       await Message.create(messageForDB);
//     } catch (error) {
//       throw new Error(error);
//     }
//   });

//   socket.on(START_TYPING, ({ members, chatId }) => {
//     const membersSockets = getSockets(members);
//     socket.to(membersSockets).emit(START_TYPING, { chatId });
//   });

//   socket.on(STOP_TYPING, ({ members, chatId }) => {
//     const membersSockets = getSockets(members);
//     socket.to(membersSockets).emit(STOP_TYPING, { chatId });
//   });

//   socket.on(CHAT_JOINED, ({ userId, members }) => {
//     onlineUsers.add(userId.toString());

//     const membersSocket = getSockets(members);
//     io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
//   });

//   socket.on(CHAT_LEAVED, ({ userId, members }) => {
//     onlineUsers.delete(userId.toString());

//     const membersSocket = getSockets(members);
//     io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
//   });

//   socket.on("disconnect", () => {
//     userSocketIDs.delete(user._id.toString());
//     onlineUsers.delete(user._id.toString());
//     socket.broadcast.emit(ONLINE_USERS, Array.from(onlineUsers));
//   });
// });



// using Socket IO Start 

// Middleware to parse cookies and authenticate socket connections
io.use((socket, next) => {
  cookieParser()(
    socket.request,
    socket.request.res,
    async (err) => await socketAuthenticator(err, socket, next)
  );
});

// Event handler for new socket connections
io.on("connection", (socket) => {
  const user = socket.user;
  // Map the user's ID to their socket ID
  userSocketIDs.set(user._id.toString(), socket.id);

  // Listen for new messages from the client
  socket.on(NEW_MESSAGE, async ({ chatId, members, message }) => {
    // Prepare the message object for real-time delivery
    const messageForRealTime = {
      content: message,
      _id: uuid(),
      sender: {
        _id: user._id,
        name: user.name,
      },
      chat: chatId,
      createdAt: new Date().toISOString(),
    };

    // Prepare the message object for database storage
    const messageForDB = {
      content: message,
      sender: user._id,
      chat: chatId,
    };

    // Get socket IDs of chat members
    const membersSocket = getSockets(members);
    // Emit the new message to the chat members in real-time
    io.to(membersSocket).emit(NEW_MESSAGE, {
      chatId,
      message: messageForRealTime,
    });
    // Emit a new message alert to the chat members
    io.to(membersSocket).emit(NEW_MESSAGE_ALERT, { chatId });

    try {
      // Save the message to the database
      await Message.create(messageForDB);
    } catch (error) {
      throw new Error(error);
    }
  });

  // Listen for typing start event from the client
  socket.on(START_TYPING, ({ members, chatId }) => {
    const membersSockets = getSockets(members);
    // Notify other members in the chat that a user has started typing
    socket.to(membersSockets).emit(START_TYPING, { chatId });
  });

  // Listen for typing stop event from the client
  socket.on(STOP_TYPING, ({ members, chatId }) => {
    const membersSockets = getSockets(members);
    // Notify other members in the chat that a user has stopped typing
    socket.to(membersSockets).emit(STOP_TYPING, { chatId });
  });

  // Listen for event when a user joins a chat
  socket.on(CHAT_JOINED, ({ userId, members }) => {
    // Add the user to the online users set
    onlineUsers.add(userId.toString());

    const membersSocket = getSockets(members);
    // Notify chat members about the updated online users list
    io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
  });

  // Listen for event when a user leaves a chat
  socket.on(CHAT_LEAVED, ({ userId, members }) => {
    // Remove the user from the online users set
    onlineUsers.delete(userId.toString());

    const membersSocket = getSockets(members);
    // Notify chat members about the updated online users list
    io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
  });

  // Handle socket disconnection
  socket.on("disconnect", () => {
    // Remove the user's socket ID and online status
    userSocketIDs.delete(user._id.toString());
    onlineUsers.delete(user._id.toString());
    // Broadcast the updated online users list to all clients
    socket.broadcast.emit(ONLINE_USERS, Array.from(onlineUsers));
  });
});


// using Socket IO End 



app.use(errorMiddleware);

server.listen(port, () => {
  console.log(`Server is running on port ${port} `);
});

export { adminSecretKey, userSocketIDs };
