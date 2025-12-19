/* eslint-disable react/no-unescaped-entities */
import EventCard from "@/components/EventCard";
import ExploreBtn from "@/components/ExploreBtn";
import { IEvent } from "@/database/event.model";

const Page = async () => {
  // get events from database

  let events = []; // Placeholder for fetched events

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/event/cloud-next-2026`,
    {
      cache: "no-store",
    }
  );

  if (response.ok) {
    events = await response.json();
  }

  return (
    <section>
      <h1 className="text-center">
        The Hub for Every Dev <br /> Event You Can't Miss
      </h1>
      <p className="text-center mt-5">
        Hackathons, Meetups, and Conferences, All in One Place
      </p>

      <ExploreBtn />

      <div className="mt-20 space-y-7">
        <h3>Featured Events</h3>

        <ul className="events">
          {events &&
            Array.isArray(events) &&
            events.map((event: IEvent) =>
              // check if event is Event type by checking if
              event && typeof event === "object" && "title" in event ? (
                <li key={event.title} className="list-none">
                  <EventCard {...event} />
                </li>
              ) : null
            )}
        </ul>
      </div>
    </section>
  );
};

export default Page;
