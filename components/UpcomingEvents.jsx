import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";

const localEvents = [
  {
    id: 1,
    title: "Neon Dreams: 80s Night",
    location: "Brooklyn Steel",
    time: "10:00 PM",
    price: "$25",
    image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=800&auto=format&fit=crop",
    tags: ["Dance", "Retro", "18+"],
    isTonight: true,
  },
  {
    id: 2,
    title: "Jazz in the Park",
    location: "Prospect Park",
    time: "Tomorrow, 2:00 PM",
    price: "Free",
    image: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?q=80&w=800&auto=format&fit=crop",
    tags: ["Jazz", "Outdoor", "Free"],
    isTonight: false,
    action: "RSVP",
  },
];

export default function UpcomingEvents() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header with Navigation */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            This Weekend in Brooklyn
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Curated picks based on your location.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-[#1a1a1a] text-white hover:bg-primary hover:border-primary transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-[#1a1a1a] text-white hover:bg-primary hover:border-primary transition-colors">
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* List Container */}
      <div className="flex flex-col gap-4">
        {localEvents.map((event) => (
          <div
            key={event.id}
            className="group flex flex-col sm:flex-row items-center gap-4 rounded-xl bg-surface-dark p-4 ring-1 ring-white/5 transition-all hover:bg-[#1a1a1a] hover:shadow-lg"
          >
            {/* Image */}
            <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-lg sm:w-48">
              <Image
                src={event.image}
                alt={event.title}
                fill
                className="object-cover"
              />
              {event.isTonight && (
                <div className="absolute top-2 left-2 flex items-center justify-center rounded bg-black/60 px-2 py-1 text-xs font-bold text-white backdrop-blur-sm">
                  Tonight
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex flex-1 flex-col justify-between h-full gap-2 text-center sm:text-left w-full">
              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">
                  {event.title}
                </h3>
                <p className="text-sm text-slate-400">
                  {event.location} • {event.time}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                {event.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-white/5 px-2 py-1 text-xs text-slate-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Action */}
            <div className="flex shrink-0 flex-col items-end gap-2 w-full sm:w-auto">
              <span className="text-xl font-bold text-white w-full text-center sm:text-right">
                {event.price}
              </span>
              <button className="rounded-lg bg-white/10 px-6 py-2 text-sm font-bold text-white hover:bg-primary transition-colors w-full sm:w-auto">
                {event.action || "Buy"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}