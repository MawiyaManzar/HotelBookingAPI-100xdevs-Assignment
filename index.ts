import express from "express";
import { db } from "./src/db";
import signupRouter from "./src/auth/signup"
import Loginrouter from "./src/auth/login";
import hotelRouter from "./src/hotels/hotel";
const app = express()



app.use(express.json())

app.get("/",(req,res)=>{
    res.json({msg:"running on bun"})
})

app.use("/auth", signupRouter)
app.use("/auth", Loginrouter)
app.use("/api",hotelRouter)

app.listen(3003)