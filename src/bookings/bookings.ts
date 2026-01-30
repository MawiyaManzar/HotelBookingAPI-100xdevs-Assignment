import express from "express"
import { customerOnly,authMiddleware } from "../auth/authMiddleware"
import { db } from "../db";
import { hotels,rooms,bookings, reviews } from "../db/schema";
import { max,eq,and, gte, lte, ilike,exists,
  sql } from "drizzle-orm";
import { date } from "zod";

const bookingRouter =  express.Router()

bookingRouter.post("/bookings", authMiddleware, customerOnly, async (req, res) => {
  try {
    const result = await db.transaction(async (trx) => {
      const { roomId, checkInDate, checkOutDate, guests } = req.body;

      if (!roomId || !checkInDate || !checkOutDate || !guests) {
        throw new Error("INVALID_REQUEST");
      }

      const userId = (req as any).user!.userId;
      const checkIn = new Date(checkInDate);
      const checkOut = new Date(checkOutDate);

      if (checkOut <= checkIn) {
        throw new Error("INVALID_DATES");
      }

      // 1️⃣ lock room row (prevents race)
      const [room] = await trx
        .select({
          id: rooms.id,
          price: rooms.pricePerNight,
          hotelId: rooms.hotelId,
          maxOccupancy: rooms.maxOccupancy
        })
        .from(rooms)
        .where(eq(rooms.id, roomId))
        .limit(1);

      if (!room) {
        throw new Error("ROOM_NOT_FOUND");
      }

      if (guests.length > room.maxOccupancy) {
        throw new Error("TOO_MANY_GUESTS");
      }

      // 2️⃣ check overlapping bookings
      const conflict = await trx
        .select({ id: bookings.id })
        .from(bookings)
        .where(
          and(
            eq(bookings.roomId, roomId),
            sql`${bookings.checkInDate} < ${checkOut} AND ${bookings.checkOutDate} > ${checkIn}`
          )
        )
        .limit(1);

      if (conflict.length > 0) {
        throw new Error("ROOM_NOT_AVAILABLE");
      }

      // 3️⃣ calculate nights + price
      const nights = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24);
      const totalPrice = String(Number(room.price) * nights);

      // 4️⃣ insert booking
      const [booking] = await trx
        .insert(bookings)
        .values({
          userId,
          roomId,
          hotelId: room.hotelId,
          checkInDate,
          checkOutDate,
          guests,
          totalPrice
        })
        .returning();

      return booking;
    });

    res.status(201).json({
      success: true,
      data: result,
      error: null
    });

  } catch (err) {
    console.error(err);

    const errorMessage = (err as Error).message;
    const statusMap: Record<string, number> = {
      INVALID_REQUEST: 400,
      INVALID_DATES: 400,
      ROOM_NOT_FOUND: 404,
      TOO_MANY_GUESTS: 400,
      ROOM_NOT_AVAILABLE: 400
    };

    const status = statusMap[errorMessage] || 500;

    res.status(status).json({
      success: false,
      data: null,
      error: errorMessage || "BOOKING_FAILED"
    });
  }
});

bookingRouter.get("/bookings",authMiddleware,customerOnly,async(req, res)=>{
    try{
        const userId = (req as any).user!.userId
        
        const {status} = req.query 
        
        const filters = [eq(bookings.userId,userId)] 

        if(status){
            filters.push(eq(bookings.status,status as "confirmed" | "cancelled"))
        }

        const rows = await db.select({
            id:bookings.id,
            roomId:rooms.id,
            hotelId:hotels.id,
            hotelName:hotels.name,
            roomNumber:rooms.roomNumber,
            roomType:rooms.roomType,
            checkInData:bookings.checkInDate,
            checkOutDate:bookings.checkOutDate,
            guests:bookings.guests,
            totalPrice:bookings.totalPrice,
            status:bookings.status,
            bookingDate:bookings.bookingDate
        }).from(bookings)
        .innerJoin(rooms, eq(rooms.id, bookings.roomId))
        .innerJoin(hotels, eq(hotels.id, bookings.hotelId))
        .where(and(...filters))
        .orderBy(bookings.bookingDate);
        
        res.status(201).json({
            success:true,
            data:rows,
            error:"null"
        })
    } catch(err) {
        console.error(err);
        res.status(500).json({
            success: false,
            data: null,
            error: "FAILED_TO_FETCH_BOOKINGS"
        });
    }
});

bookingRouter.put("/bookings/:bookingId/cancel",authMiddleware,customerOnly,async (req,res)=>{
    try{
        const userId= (req as any).user!.userId
        const {bookingId} = req.params
        
        //fetch bookings
        const [booking] = await db.select({
            id:bookings.id,
        userId:bookings.userId,
        status:bookings.status,
        checkInDate:bookings.checkInDate

    }).from(bookings).where(eq(bookings.id,bookingId)).limit(1)
    
    if (!booking) {
        return res.status(404).json({
          success: false,
          data: null,
          error: "BOOKING_NOT_FOUND"
        });
      }
      
    //ownership check
    if (booking.userId !== userId) {
        return res.status(403).json({
          success: false,
          data: null,
          error: "FORBIDDEN"
        });
      }

      // lessthan 24hrs not allowed
    const now = new Date();
    const hoursUntilCheckIn = (new Date(booking.checkInDate).getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilCheckIn < 24) {
      return res.status(400).json({
          success: false,
        data: null,
        error: "CANNOT_CANCEL_WITHIN_24_HOURS"
    });
    }

    // ❌ already cancelled
    if (booking.status === "cancelled") {
        return res.status(400).json({
            success: false,
          data: null,
          error: "ALREADY_CANCELLED"
        });
      }

      //canceliing
    const [update] = await db.update(bookings).set({
        status:"cancelled",
        cancelledAt:new Date()
    })
    .where(eq(bookings.id,bookingId))
    .returning({
        id:bookings.id,
        status:bookings.status,
        cancelledAt:bookings.cancelledAt
    })

    res.json({
        success:true,
        data:update,
        error:"null"
    })
}catch(err){
        console.error(err)
        res.status(500).json({
            success:false,
            data:null,
            error:"failed to cancel booking"
        })
    }
    
})

bookingRouter.post("/reviews",authMiddleware,customerOnly,async (req,res)=>{
  try{
    const userId = (req as any).user!.userId
    const {bookingId,rating,comment} = req.body

    //fetch booking
    const result = await db.transaction(async(trx)=>{
      const [booking] = await trx.select({
            id: bookings.id,
            userId: bookings.userId,
            hotelId: bookings.hotelId,
            status: bookings.status,
            checkOutDate: bookings.checkOutDate
      }).from(bookings)
      .where(eq(bookings.id,bookingId))
      .limit(1)
      if(!booking){
        throw new Error("Booking Not Found")
      }
      if(booking.userId != userId){
        throw new Error("Forbidden")
      }
       if (booking.status !== "confirmed") {
          throw new Error("BOOKING_NOT_CONFIRMED");
        }
      const today = new Date()
      const checkOutDate = new Date(booking.checkOutDate)

      if(today<checkOutDate){
        throw new Error("Stay Not Completed")
      }
      
      //insert review
      const [review] = await trx
      .insert(reviews)
      .values({
        userId,
        hotelId:booking.hotelId,
        bookingId,
        rating,
        comment
      })
      .returning()

      //hotel aggregation
      const [hotel] = await trx
      .select({
        rating:hotels.ratings,
        totalReviews:hotels.totalreviews
      })
      .from(hotels)
      .where(eq(hotels.id,booking.hotelId))
      .limit(1)

      if (!hotel || hotel.totalReviews === null) {
        throw new Error("HOTEL_NOT_FOUND");
      }

      const oldRating = Number(hotel.rating)
      const totalReviews = hotel.totalReviews
      const newAvg = ((oldRating * totalReviews) + rating) / (totalReviews + 1)

          await trx
      .update(hotels)
      .set({
        ratings:newAvg.toFixed(1),
        totalreviews:totalReviews + 1
      })
      .where(eq(hotels.id,booking.hotelId))

      return review
    })
    res.status(201).json({
      success:true,
      data:result,
      error:null
    })

  }catch(err:any){
    console.error(err)
    const code = err.message;

      if (
        code === "BOOKING_NOT_FOUND" ||
        code === "FORBIDDEN" ||
        code === "BOOKING_NOT_CONFIRMED" ||
        code === "STAY_NOT_COMPLETED"
      ) {
        return res.status(400).json({
          success: false,
          data: null,
          error: code
        });
      }

      res.status(500).json({
        success: false,
        data: null,
        error: "FAILED_TO_CREATE_REVIEW"
      });
  }
    
})

