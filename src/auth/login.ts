import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { users } from "../db/schema";
import { db } from "../db/index";
import express from "express";
import { password } from "bun";
import { success } from "zod";

const Loginrouter = express.Router()

Loginrouter.use(express.json())

Loginrouter.post("/login", async (req, res) => {
try{
    const {email,password} = req.body;
    
    if (!email|| !password){
        return res.status(400).json({
            success:false,
            data:null,
            error:"Invalid Request "
        })
    }
    
    const [user]=await db 
    .select({
        id:users.id,
        email:users.email,
        name:users.name,
        password:users.password,
        role:users.role
    })
    .from(users)
    .where(eq(users.email,email))
    .limit(1)
    if (!user) {
        return res.status(401).json({
            success: false,
            data: null,
            error: "Invalid credentials"
        });
    }

    const isValid = await bcrypt.compare(password,user.password)

        if (!isValid) {
      return res.status(401).json({
        success: false,
        data: null,
        error: "Invalid credentials"
      });
    }

    const token = jwt.sign({
        id:user.id,role:user.role
    },
    process.env.JWT_SECRET!,{
        expiresIn:"7d"
    }
    )
    res.json(
        {
            success:true,
            data:{
                token,
                user
            },
            error:null

        }
    )

    
}
catch(err){
    console.error(err);
    res.status(500).json({
        success: false,
        data: null,
        error: "Internal server error"
    });
}
})

export default Loginrouter