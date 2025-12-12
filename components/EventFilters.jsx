import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";

const EventFilters = ({ filters, onFilterChange }) => {
  const filterItems = [
    { key: "genre", label: "Genre" },
    { key: "bestie", label: "Bestie" },
    { key: "dateWeek", label: "Date" },
    { key: "dateMonth", label: "Date" },
    { key: "priceRange", label: "Price Range" },
    { key: "priceFree", label: "Price Range" },
    { key: "spiceHot", label: "Spice Monte" },
    { key: "cityLocal", label: "City" },
    { key: "cityAll", label: "City" },
  ];

  return (
    <div className="bg-card/30 rounded-2xl p-6 border border-border/30">
      <h3 className="text-lg font-semibold text-foreground mb-6">Filter By</h3>
      
      {/* Mates Label */}
      <div className="mb-4">
        <span className="text-muted-foreground text-sm">Mates</span>
      </div>

      {/* Filter Toggles */}
      <div className="space-y-4">
        {filterItems.map((item) => (
          <div key={item.key} className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">{item.label}</span>
            <Switch
              checked={filters[item.key]}
              onCheckedChange={(checked) => onFilterChange(item.key, checked)}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        ))}
      </div>

      {/* Price Slider */}
      <div className="mt-8 pt-4 border-t border-border/30">
        <Slider
          value={[filters.priceValue]}
          onValueChange={([value]) => onFilterChange("priceValue", value)}
          max={200}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>$0</span>
          <span className="text-primary">${filters.priceValue}</span>
          <span>$200+</span>
        </div>
      </div>
    </div>
  );
};

export default EventFilters;
