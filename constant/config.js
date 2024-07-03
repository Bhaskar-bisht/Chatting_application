const corsOptions = {
    origin: [
      "https://chatweb-application-cogy.onrender.com",
      "http://localhost:4173",
      process.env.CLIENT_URL,
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  };
  
  const CHATTU_TOKEN = "chattu-token";
  
  export { CHATTU_TOKEN, corsOptions };
