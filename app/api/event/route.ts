import { Event } from "@/database";
import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

// get all events
export async function GET(request: NextRequest) {
    try {
        await connectToDatabase();
        const events = await Event.find().populate('bookings');
        return new Response(JSON.stringify(events), { status: 200 });
    } catch (error) {
        console.error("Error fetching events:", error);
        return new Response(JSON.stringify({ error: "Failed to fetch events" }), { status: 500 });
    }
}

// create a new event

export async function POST(request: NextRequest) {
    try {
        await connectToDatabase();

        const contentType = request.headers.get("content-type") || "";
        let data;

        // Handle JSON
        if (contentType.includes("application/json")) {
            data = await request.json();
        }
        // Handle multipart/form-data
        else if (contentType.includes("multipart/form-data")) {
            let formData: FormData;

            try {
                formData = await request.formData();
            } catch (err) {
                return NextResponse.json(
                    {
                        message: "Invalid form-data",
                        error: (err as Error).message,
                    },
                    { status: 400 }
                );
            }

            data = Object.fromEntries(formData.entries());
        }
        // Unsupported Content-Type
        else {
            return NextResponse.json(
                {
                    message: "Unsupported Content-Type",
                    supported: [
                        "application/json",
                        "multipart/form-data",
                    ],
                },
                { status: 415 }
            );
        }

        const createdEvent = await Event.create(data);

        return NextResponse.json(
            {
                message: "Event created successfully",
                event: createdEvent,
            },
            { status: 201 }
        );
    } catch (error) {
        return NextResponse.json(
            {
                message: "Internal server error",
                error: (error as Error).message,
            },
            { status: 500 }
        );
    }
}
