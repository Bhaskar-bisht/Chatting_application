const corsOptions = {
    origin: "https://chatting-frontend.onrender.com",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  };
  
  const CHATTU_TOKEN = "chattu-token";
  
  export { CHATTU_TOKEN, corsOptions };
