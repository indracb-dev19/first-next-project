import { Event } from "@/database";
import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
    try {
        await connectToDatabase();
        const event = await Event.findOne({ slug: params.slug });
        if (!event) {
            return new Response(JSON.stringify({ error: "Event not found" }), { status: 404 });
        }
        return new Response(JSON.stringify(event), { status: 200 });
    } catch (error) {
        console.error("Error fetching event:", error);
        return new Response(JSON.stringify({ error: "Failed to fetch event" }), { status: 500 });
    }
}