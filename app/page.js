import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import { Users, Calendar, Wrench } from "lucide-react";
import TrendingEvents from "@/components/TrendingEvents";
import ManageEventSection from "@/components/ManageEventSection";
import UpcomingEvents from "@/components/UpcomingEvents";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar isLoggedIn={false}/>

      <main className="flex-1">
        {/* Hero Section */}
        <Hero />
        <TrendingEvents />
        <UpcomingEvents />
        <ManageEventSection />
      </main>

      <Footer isLoggedIn={false}/>
    </div>
  );
}
