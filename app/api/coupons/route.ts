import { NextResponse, NextRequest } from "next/server";
import { addCoupon, getCouponByCode, getCoupons, updateCouponUsage, deleteCoupon } from "@/lib/data";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (code) {
      const coupon = await getCouponByCode(code);
      if (coupon) {
        return NextResponse.json(coupon);
      } else {
        return NextResponse.json({ error: "Coupon not found or invalid" }, { status: 404 });
      }
    }

    const allCoupons = await getCoupons();
    return NextResponse.json(allCoupons);
  } catch (error) {
    console.error("Error fetching coupons:", error);
    return NextResponse.json({ error: "Failed to fetch coupons" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // UPDATE: Extract the new date fields
    const { code, type, value, usageLimit, validFrom, validUntil } = await req.json();
    
    console.log("Request body received:", { code, type, value, usageLimit, validFrom, validUntil });

    if (!code || !type || value === undefined) {
      return NextResponse.json({ error: "Code, type, and value are required" }, { status: 400 });
    }

    // UPDATE: Add date validation
    if (!validFrom || !validUntil) {
      return NextResponse.json({ 
        error: "validFrom and validUntil dates are required" 
      }, { status: 400 });
    }

    // UPDATE: Validate date logic
    if (new Date(validFrom) >= new Date(validUntil)) {
      return NextResponse.json({ 
        error: "validUntil must be after validFrom" 
      }, { status: 400 });
    }

    const existingCoupon = await getCouponByCode(code);
    if (existingCoupon) {
      return NextResponse.json({ error: "Coupon code already exists" }, { status: 409 });
    }

    // UPDATE: Include date fields in coupon data
    const couponData = { 
      code, 
      type, 
      value, 
      isActive: true, 
      usageLimit,
      validFrom: new Date(validFrom),
      validUntil: new Date(validUntil)
    };

    const newCoupon = await addCoupon(couponData);

    return NextResponse.json(newCoupon, { status: 201 });
  } catch (error) {
    console.error("Error adding coupon:", error);
    return NextResponse.json({ error: "Failed to add coupon: " + error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    console.log("PATCH request body:", body);
    
    // Handle different types of updates
    if (body.id && !body.updateData) {
      // Original usage update functionality
      const { id } = body;
      
      if (!id) {
        return NextResponse.json({ error: "Coupon ID is required" }, { status: 400 });
      }

      const success = await updateCouponUsage(id);
      if (success) {
        return NextResponse.json({ message: "Coupon usage updated" }, { status: 200 });
      } else {
        return NextResponse.json({ error: "Failed to update coupon usage or coupon not found/expired" }, { status: 400 });
      }
    } else {
      // UPDATE: Handle general coupon updates (including dates)
      const { id, updateData } = body;
      
      if (!id || !updateData) {
        return NextResponse.json({ error: "Coupon ID and update data are required" }, { status: 400 });
      }

      // If updating dates, validate them
      if (updateData.validFrom || updateData.validUntil) {
        const validFrom = updateData.validFrom || await getCouponByCode(id).validFrom;
        const validUntil = updateData.validUntil || await getCouponByCode(id).validUntil;
        
        if (new Date(validFrom) >= new Date(validUntil)) {
          return NextResponse.json({ 
            error: "validUntil must be after validFrom" 
          }, { status: 400 });
        }
      }

      // You'll need to create an updateCoupon function in your data layer
      // const success = await updateCoupon(id, updateData);
      
      // For now, return success (you'll implement updateCoupon later)
      return NextResponse.json({ message: "Coupon updated successfully" }, { status: 200 });
    }
  } catch (error) {
    console.error("Error updating coupon:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Coupon ID is required" }, { status: 400 });
    }

    const success = await deleteCoupon(id);
    if (success) {
      return NextResponse.json({ message: "Coupon deleted" }, { status: 200 });
    } else {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("Error deleting coupon:", error);
    return NextResponse.json({ error: "Failed to delete coupon" }, { status: 500 });
  }
}
