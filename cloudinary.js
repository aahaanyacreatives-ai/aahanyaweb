import { NextRequest,NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { Auth } from "@auth/core";


    // Configuration
    cloudinary.config({ 
        cloud_name: process.env.CLOUD_NAME, // Or replace with your value
       api_key: process.env.API_KEY,
       api_secret: process.env.API_SECRET, // Click 'View API Keys' above to copy your API secret
    });


    