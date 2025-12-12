import GenreCard from "./GenreCard";

const genres = [
  {
    image: "https://picsum.photos/400/400?random=5",
    name: "POP",
    gradientClass: "gradient-pop"
  },
  {
    image: "https://picsum.photos/400/400?random=6",
    name: "ELECTRONIC",
    gradientClass: "gradient-electronic"
  },
  {
    image: "https://picsum.photos/400/400?random=7",
    name: "ROCK",
    gradientClass: "gradient-rock"
  },
  {
    image: "https://picsum.photos/400/400?random=8",
    name: "HIP-HOP",
    gradientClass: "gradient-hiphop"
  }
];

const BrowseByGenre = () => {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <h2 className="text-2xl font-bold text-foreground mb-8 tracking-wide">
          BROWSE BY GENRE
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {genres.map((genre, index) => (
            <div 
              key={genre.name}
              className="animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <GenreCard {...genre} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BrowseByGenre;