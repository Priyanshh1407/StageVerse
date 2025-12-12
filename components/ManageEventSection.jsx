import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

const ManageEventSection = () => {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <h2 className="text-2xl font-bold text-foreground mb-8 tracking-wide">
          BROWSE BY GENRE
        </h2>
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Dashboard Image with Device Frame */}
          <div className="animate-fade-in-up">
            <div className="relative bg-muted/20 rounded-2xl p-3 border border-border/30 shadow-elevated">
              {/* Screen bezel */}
              <div className="rounded-xl overflow-hidden border-4 border-muted/40 bg-background">
                <img
                  src="https://picsum.photos/800/600?random=10"
                  alt="Event management dashboard"
                  className="w-full h-auto"
                />
              </div>
              {/* Device stand/base */}
              <div className="flex justify-center mt-2">
                <div className="w-16 h-1 bg-muted/40 rounded-full"></div>
              </div>
            </div>
          </div>
          {/* Content */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
              MANAGE YOUR EVENT.
              <br />
              SEAMLESSLY
            </h3>
            <p className="text-muted-foreground mb-6 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Use our AI powered assistant to write compelling event descriptions in seconds
            </p>
            <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
              BECOME A PARTNER
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ManageEventSection;