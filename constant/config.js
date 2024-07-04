const corsOptions = {
    origin: [
      "https://chatweb-application-cogy.onrender.com",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  };
  
  const CHATTU_TOKEN = "chattu-token";
  
  export { CHATTU_TOKEN, corsOptions };
