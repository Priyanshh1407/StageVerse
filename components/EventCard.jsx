import { cn } from "@/lib/utils";

const EventCard = ({ image, title, date, venue, highlighted, overlayText }) => {
  return (
    <div 
      className={cn(
        "group relative rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 cursor-pointer",
        highlighted && "ring-2 ring-primary glow-cyan"
      )}
    >
      {/* Image */}
      <div className="aspect-square relative">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover"
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
        
        {/* Overlay Text */}
        {overlayText && (
          <div className="absolute top-4 left-4 right-4">
            <span className="text-xs font-semibold text-muted-foreground tracking-wider">
              {overlayText}
            </span>
          </div>
        )}
      </div>
      {/* Info */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className="text-foreground font-semibold text-lg group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="text-muted-foreground text-sm">{date}</p>
        <p className="text-muted-foreground text-sm">{venue}</p>
      </div>
    </div>
  );
};

export default EventCard;