import { cn } from "@/lib/utils";

const GenreCard = ({ image, name, gradientClass }) => {
  return (
    <div className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-elevated">
      {/* Image */}
      <div className="aspect-[4/3] relative">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover"
        />
        {/* Gradient Overlay */}
        <div className={cn("absolute inset-0 opacity-70 mix-blend-overlay", gradientClass)} />
        <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent" />
      </div>
      {/* Genre Name */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl md:text-3xl font-bold text-foreground drop-shadow-lg tracking-wider">
          {name}
        </span>
      </div>
    </div>
  );
};

export default GenreCard;