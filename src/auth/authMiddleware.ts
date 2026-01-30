import jwt  from "jsonwebtoken";

export function authMiddleware(req:any,res:any,next:any){

    // header -> token-> jwt.verify ->  call next
    
    const header = req.headers.authorization

    if(!header){
        return res.status(401).json({
            success:false,
            error:"no token"
        })
    }

    const token = header.split(" ")[1]

    try{
        const decoded = jwt.verify(token,process.env.JWT_SECRET!)
        req.user = decoded
        next()
    }catch{
        return res.status(401).json({
            success:false,
            error:"Invalid token"
        })
    }

}

export function ownerOnly(req:any,res:any,next:any){
    if(req.user?.role !== "owner"){
        return res.status(401).json({
            success:false,
            error:"Only hotel owners can access this"
        })
    }
    next()
}

export function customerOnly(req:any,res:any,next:any){
    if(req.user?.role !== "customer"){
        return res.status(401).json({
            success:false,
            error:"FORBIDDEN"
        })
    }
}

// export function ownerHotel(req:any,res:any,next:any){
//     if(req.user?.)
// }