import express from "express"
import { ownerOnly,authMiddleware } from "../auth/authMiddleware"
import { success } from "zod";
import { db } from "../db";
import { hotels,rooms } from "../db/schema";
import { max,eq,and, gte, lte, ilike,exists,
  sql } from "drizzle-orm";
/*
{
  "name": "Grand Palace Hotel",
  "description": "Luxury 5-star hotel in the heart of the city",
  "city": "Mumbai",
  "country": "India",
  "amenities": ["wifi", "pool", "gym", "parking", "restaurant"]
}
*/

const hotelRouter =  express.Router()

hotelRouter.post('/hotels',authMiddleware,ownerOnly,async(req,res)=>{
    try{
    const {name,description,city,country,amenities} = req.body;

    if(!name || !description || !city || !country || !amenities){
        return res.status(401).json({
            success:false,
            error:"Missing required fields"
        })
    }

    const ownerId = (req as any).user.id

    const [hotel] = await db
        .insert(hotels)
        .values({
          ownerId,
          name,
          description,
          city,
          country,
          amenities
        })
        .returning();

    res.status(201).json({
        success:true,
        data:hotel,
        error:"null"
    })
} catch (err) {
  console.error(err);

  res.status(500).json({
    success: false,
    data: null,
    error: "Failed to create hotel",
  });
}
})


hotelRouter.post("/hotels/:hotelId/rooms",authMiddleware,ownerOnly,async (req,res)=>{
    try{
    const { hotelId } = req.params;

    const {roomNumber,roomType,pricePerNight,maxOccupancy} = req.body;

    if(!roomNumber || !roomType || !pricePerNight || !maxOccupancy){
        return res.status(401).json({
            success:false,
            data:null,
            error:"Invalid request"
        })
    }

    //checking hotel exists

    const [hotelExists] = await db.select({id:hotels.id}).from(hotels).where(eq(hotels.id,hotelId)).limit(1)

    if(!hotelExists){
       return res.status(404).json({
      success: false,
      data: null,
      error: "HOTEL_NOT_FOUND"
      });
    }

    const ownerId =(req as any ).user.id
    //checking hotel belongs to the user 
    const [hotel] = await db
        .select({ id: hotels.id })
        .from(hotels)
        .where(
          and(
            eq(hotels.id, hotelId),
            eq(hotels.ownerId, ownerId)
          )
        )
        .limit(1);
    
    if(!hotel){
        return res.status(403).json({
            success:false,
            data:null,
            error:"FORBIDDEN "
        })
    }
    //room_number already exists solved

    const [existingRoom] = await db.select({id:rooms.id}).from(rooms).where(
      and(
        eq(rooms.hotelId,hotelId),
        eq(rooms.roomNumber,roomNumber)
      )
    ).limit(1)

    if(existingRoom){
      return res.status(400).json({
        success:false,
        data:null,
        error:"ROOM_ALREADY_EXISTS"
      })
    }

    //insert room
    const [room] = await db.insert(rooms).values({
          hotelId,
          roomNumber,
          roomType,
          pricePerNight,
          maxOccupancy
    }).returning( )

    res.status(201).json({
        success: true,
        data: room,
        error: null
      });

    } catch (err) {
      console.error(err);

      res.status(500).json({
        success: false,
        data: null,
        error: "Failed to add room"
      });
    }
})

hotelRouter.get("/hotels",authMiddleware,async(req,res)=>{

  try{
    const { city, country, minPrice, maxPrice, minRating } =req.query;

    const filters = []

    if(city){
      filters.push(ilike(hotels.city,`%${city}%`))
    }

    if(country){
      filters.push(ilike(hotels.country,`%${country}%`))
    }

    if (minRating) {
      filters.push(
        gte(hotels.ratings, String(minRating))
      );
    }
      if (minPrice || maxPrice) {
    const min = minPrice ? Number(minPrice) : 0;
    const max = maxPrice
      ? Number(maxPrice)
      : Number.MAX_SAFE_INTEGER;

    filters.push(
      exists(
        db
          .select({ id: rooms.id })
          .from(rooms)
          .where(
            and(
              sql`${rooms.hotelId} = ${hotels.id}`,
              gte(sql`CAST(${rooms.pricePerNight} AS NUMERIC)`, min),
              lte(sql`CAST(${rooms.pricePerNight} AS NUMERIC)`, max)
            )
          )
      )
    );
  }

  const query = db.select().from(hotels)

  const result = filters.length > 0 ? await query.where(and(...filters)) : await query

  res.json({
    success:true,
    data:result,
    error:null
  })

    
  }catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      data: null,
      error: "FAILED_TO_FETCH_HOTELS"
    });
  }
})


hotelRouter.get("/hotels/:hotelId",authMiddleware,async(req,res)=>{
  try{
  const { hotelId } = req.params

  //get hotel
  const [hotel] = await db.select().from(hotels).where(eq(hotels.id,hotelId)).limit(1)

  if(!hotel){
    return res.status(404).json({
       success: false,
          data: null,
          error: "HOTEL_NOT_FOUND"
    })
  }

  const [hotelRooms] = await db.select({
      id: rooms.id,
      roomNumber: rooms.roomNumber,
      roomType: rooms.roomType,
      pricePerNight: rooms.pricePerNight,
      maxOccupancy: rooms.maxOccupancy
        }).from(rooms).where(eq(rooms.hotelId,hotelId,))  

  res.status(401).json({
    success:true,
    data:{...hotel,hotelRooms},
    error:null
  })
  }catch(err){
    console.error(err)
     res.status(500).json({
        success: false,
        data: null,
        error: "FAILED_TO_FETCH_HOTEL"
      });
  }


})

export default hotelRouter