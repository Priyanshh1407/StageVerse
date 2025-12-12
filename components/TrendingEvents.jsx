import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";

const trendingEvents = [
  {
    id: 1,
    title: "The Midnight",
    genre: "Synthwave",
    genreColor: "text-primary border-primary/20 bg-primary/20",
    date: { month: "OCT", day: "14" },
    location: "Terminal 5, NYC",
    price: "$45",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC3_NvR6d4EcVfuiQIQDm5yZ485YDOzci38wTsxS1BtBl8ZBP504wMNYTKcPGDEjT9nsssXXaKF84iNY1rGiloPo2vyeDyi9BUn9IitDAEMAWZIZTikwDYUAQC-enIffQd8-KgVhYn-oFvXf4KH0qCOu_sW5P85D3SM183fl1f7U0bONTFrjvT8UoF5s4C4Hnt9f537n8yekhvDTRyZlqvNrJ_Xu3Yx3EmPzu8sHkfmF6m2oQe6KoJiX7QSDijbxoVYMIqEeN762iKB",
    action: "Get Tickets",
  },
  {
    id: 2,
    title: "Glass Animals",
    genre: "Indie Pop",
    genreColor: "text-purple-400 border-purple-500/20 bg-purple-500/20",
    date: { month: "NOV", day: "02" },
    location: "The Greek, LA",
    price: "Waitlist",
    image: "https://images.unsplash.com/photo-1502872364588-894d7d6ddfab?q=80&w=800&auto=format&fit=crop",
    action: "Join Waitlist",
    isWaitlist: true,
  },
  {
    id: 3,
    title: "Tomorrowland",
    genre: "EDM",
    genreColor: "text-yellow-400 border-yellow-500/20 bg-yellow-500/20",
    date: { month: "NOV", day: "18" },
    location: "Boom, Belgium",
    price: "$120",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC3_NvR6d4EcVfuiQIQDm5yZ485YDOzci38wTsxS1BtBl8ZBP504wMNYTKcPGDEjT9nsssXXaKF84iNY1rGiloPo2vyeDyi9BUn9IitDAEMAWZIZTikwDYUAQC-enIffQd8-KgVhYn-oFvXf4KH0qCOu_sW5P85D3SM183fl1f7U0bONTFrjvT8UoF5s4C4Hnt9f537n8yekhvDTRyZlqvNrJ_Xu3Yx3EmPzu8sHkfmF6m2oQe6KoJiX7QSDijbxoVYMIqEeN762iKB",
    action: "Get Tickets",
  },
  {
    id: 4,
    title: "Warehouse Project",
    genre: "Techno",
    genreColor: "text-red-400 border-red-500/20 bg-red-500/20",
    date: { month: "DEC", day: "05" },
    location: "Manchester, UK",
    price: "$55",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAYn6Y77xpPtFfYdfU6q-MS2VGkOc2yHs_Ws8ziLIO0lyMCM0_bGlPpIF1PH3VY41YT9G_SakqQl4nr-6sqSAai3rAkLIikMKFOHEEr1Kh6qEjID_g1mpICZI6TKffUxud78eRaNfaXPvRQt8BZsXvxiF1cpHHPXjjWu64K_5fP9Q2l2dmOON9d_EwmGtPzLIYhD3XtO55SNBK8r27kdI49xSpI2zjRz6yZ11uUngOFJIUPSy1pDEfU-GkG0teEG7dJvWorZiSllVyy",
    action: "Get Tickets",
  },
];

export default function TrendingNow() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Trending Now
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Events getting the most hype this week.
          </p>
        </div>
        <Link
          className="hidden text-sm font-medium text-primary hover:text-blue-400 sm:block"
          href="/explore"
        >
          View all →
        </Link>
      </div>

      {/* Grid */}
      <div className="mb-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {trendingEvents.map((event) => (
          <div
            key={event.id}
            className="group relative overflow-hidden rounded-xl bg-surface-dark ring-1 ring-white/5 transition-all hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] hover:ring-primary/50"
          >
            {/* Image Container */}
            <div className="aspect-[4/5] w-full overflow-hidden relative">
              <Image
                src={event.image}
                alt={event.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-90"></div>

              {/* Date Badge */}
              <div className="absolute right-3 top-3 flex flex-col items-center rounded-lg bg-[#1a1a1a]/90 px-3 py-1.5 text-center backdrop-blur-md">
                <span className="text-xs font-bold text-primary uppercase">
                  {event.date.month}
                </span>
                <span className="text-lg font-bold text-white">
                  {event.date.day}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="absolute bottom-0 left-0 w-full p-5">
              <div className="mb-2 flex gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${event.genreColor}`}
                >
                  {event.genre}
                </span>
              </div>
              <h3 className="mb-1 text-xl font-bold text-white">
                {event.title}
              </h3>
              <div className="mb-4 flex items-center gap-2 text-sm text-slate-300">
                <MapPin className="h-4 w-4 text-primary" />
                {event.location}
              </div>
              <button
                className={`w-full rounded-lg py-2.5 text-sm font-bold text-white transition-colors ${
                  event.isWaitlist
                    ? "bg-[#2a2a2a] border border-white/10 hover:bg-white hover:text-black"
                    : "bg-primary hover:bg-blue-600"
                }`}
              >
                {event.isWaitlist
                  ? event.action
                  : `${event.action} • ${event.price}`}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}