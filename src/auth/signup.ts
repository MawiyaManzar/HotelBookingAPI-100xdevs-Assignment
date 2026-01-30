import express from "express";
import { users } from "../db/schema";
import { db } from "../db/index";
import bcrypt from "bcryptjs";
import { success } from "zod";
import { eq } from "drizzle-orm";

const signupRouter = express.Router();


signupRouter.use(express.json())

signupRouter.post("/signup", async (req, res) => {
    try {
        const { email, password, name, phone, role } = req.body;

        if(!email || !password || !name || !phone || !role ){
            return res.status(400).json({
                success:false,
                data:null,
                error:"Invalid Schema"
            })
        }

        //hashed password
        const hashedPassword = await bcrypt.hash(password, 10)

        const existingUser = await db.select({id:users.id}).from(users).where(eq(users.email,email))

        if(existingUser.length > 0){
            return res.status(400).json({
                success:false,
                data:null,
                error:"email already registered"
            })
        }

        //insert
        const [user] = await db
            .insert(users)
            .values({
                email,
                name,
                phone,
                role,
                password: hashedPassword
            })
            .returning({
                id: users.id,
                email: users.email,
                name: users.name,
                phone: users.phone,
                role: users.role
            });


        res.status(201).json({
            success: true,
            data: user,
            error: null
        });
    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).json({
            success: false,
            data: null,
            error: err
        })
    }
})

export default signupRouter;
