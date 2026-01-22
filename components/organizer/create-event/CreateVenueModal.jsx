'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from "sonner";
import {
  X,
  Landmark,
  MapPin,
  Image as ImageIcon,
  Info,
  Check,
  ChevronDown,
  Users,
  Save,
  Map as MapIcon,
  CloudUpload
} from 'lucide-react';import OrganizerSidebar from '@/components/organizer/OrganizerSidebar'; // Adjusted path based on typical structure

export default function CreateVenueModal({
  isOpen,
  onClose,
  initialName,
  onSuccess
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);  const [formData, setFormData] = useState({
    name: '',
    type: '',
    capacity: '',
    address: '',
    city: '',
    description: '',
    bagPolicy: '',
    hasParking: true, // Default from your UI
  });  useEffect(() => {
    if (isOpen && initialName) {
      setFormData(prev => ({ ...prev, name: initialName }));
    }
  }, [isOpen, initialName]);  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };  const handleSaveVenue = async () => {    if (!formData.name || !formData.city || !formData.address) {
      toast.error("Please fill in Venue Name, City, and Address");
      return;
    }

    setIsSubmitting(true);

    try {      const res = await fetch('/api/venues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {        if (onSuccess) {
          onSuccess(data.data);
        }        router.push('/create-event');        onClose();        setFormData({
          name: '', type: '', capacity: '', address: '', city: '',
          description: '', bagPolicy: '', hasParking: true
        });

      } else {
        toast.error("Error: " + data.message);
      }
    } catch (err) {
      console.error("Failed to save venue", err);
      toast.error("Server error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (    <div className="fixed inset-0 z-[100] flex h-screen w-screen overflow-hidden bg-black/80 backdrop-blur-sm">

      {}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #101622; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #314368; 
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #4b5f88; 
        }
      `}</style>

      {}
      <div className="shrink-0 h-full hidden md:block">
        <OrganizerSidebar />
      </div>

      {}
      <div className="flex-1 relative flex items-center justify-center p-4 sm:p-6">

        {}
        <div
          onClick={onClose}
          className="absolute inset-0 cursor-pointer"
        />

        {}
        <div className="relative w-full max-w-3xl bg-[#101622] border border-[#314368] rounded-xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 overflow-hidden z-10">

          {}
          <div className="flex items-center justify-between px-5 py-4 md:px-6 md:py-5 border-b border-[#314368] bg-[#101622] shrink-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#0d59f2] shadow-lg shadow-[#0d59f2]/20 flex items-center justify-center text-white shrink-0">
                <Landmark className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-bold text-white leading-tight">Add New Venue</h2>
                <p className="text-[#90a4cb] text-xs md:text-sm">Enter location details for listing</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-[#90a4cb] hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {}
          <div className="overflow-y-auto p-5 md:p-8 flex flex-col gap-8 custom-scrollbar bg-[#101622]">

            {}
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-2 pb-2 border-b border-[#314368]/50">
                <Info className="w-5 h-5 text-[#0d59f2]" />
                <h3 className="text-base md:text-lg font-bold text-white">Core Details</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {}
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-white text-sm font-medium">Venue Name <span className="text-red-400">*</span></label>
                  <input
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-[#314368] bg-[#182234] h-12 px-4 text-white placeholder-[#90a4cb] focus:ring-2 focus:ring-[#0d59f2] focus:border-transparent outline-none transition-all"
                    placeholder="e.g., Hollywood Bowl"
                  />
                </div>

                {}
                <div className="flex flex-col gap-2">
                  <label className="text-white text-sm font-medium">Venue Type</label>
                  <div className="relative">
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleChange}
                      className="w-full appearance-none rounded-lg border border-[#314368] bg-[#182234] h-12 pl-4 pr-10 text-white focus:ring-2 focus:ring-[#0d59f2] focus:border-transparent outline-none cursor-pointer"
                    >
                      <option value="" disabled>Select a type...</option>
                      <option value="amphitheater">Outdoor Amphitheater</option>
                      <option value="arena">Indoor Arena</option>
                      <option value="club">Club / Hall</option>
                      <option value="stadium">Stadium</option>
                      <option value="theater">Theater</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#90a4cb] pointer-events-none w-5 h-5" />
                  </div>
                </div>

                {}
                <div className="flex flex-col gap-2">
                  <label className="text-white text-sm font-medium">Capacity</label>
                  <div className="relative">
                    <input
                      name="capacity"
                      type="text"
                      value={formData.capacity}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-[#314368] bg-[#182234] h-12 pl-4 pr-10 text-white placeholder-[#90a4cb] focus:ring-2 focus:ring-[#0d59f2] focus:border-transparent outline-none transition-all"
                      placeholder="e.g., 17,500"
                    />
                    <Users className="absolute right-3 top-1/2 -translate-y-1/2 text-[#90a4cb] w-5 h-5 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {}
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-2 pb-2 border-b border-[#314368]/50">
                <MapPin className="w-5 h-5 text-[#0d59f2]" />
                <h3 className="text-base md:text-lg font-bold text-white">Location</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {}
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-white text-sm font-medium">Street Address <span className="text-red-400">*</span></label>
                  <input
                    name="address"
                    type="text"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-[#314368] bg-[#182234] h-12 px-4 text-white placeholder-[#90a4cb] focus:ring-2 focus:ring-[#0d59f2] focus:border-transparent outline-none transition-all"
                    placeholder="e.g., 2301 N Highland Ave"
                  />
                </div>

                {}
                <div className="flex flex-col gap-2">
                  <label className="text-white text-sm font-medium">City <span className="text-red-400">*</span></label>
                  <input
                    name="city"
                    type="text"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-[#314368] bg-[#182234] h-12 px-4 text-white placeholder-[#90a4cb] focus:ring-2 focus:ring-[#0d59f2] focus:border-transparent outline-none transition-all"
                    placeholder="e.g., Los Angeles"
                  />
                </div>

                {}
                <div className="md:col-span-1 h-32 md:h-auto rounded-lg overflow-hidden border border-[#314368] relative group">
                  <div
                    className="w-full h-full bg-cover bg-center opacity-60 group-hover:opacity-80 transition-opacity"
                    style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1580655653885-65763b2597d0?q=80&w=800&auto=format&fit=crop")' }}
                  ></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button className="bg-[#182234]/80 backdrop-blur px-3 py-1.5 rounded-full text-xs font-medium text-white border border-[#314368] hover:bg-[#182234] transition-colors flex items-center gap-1">
                      <MapIcon className="w-3.5 h-3.5" />
                      Verify Location
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {}
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-2 pb-2 border-b border-[#314368]/50">
                <Check className="w-5 h-5 text-[#0d59f2]" />
                <h3 className="text-base md:text-lg font-bold text-white">Details & Policies</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {}
                <div
                  onClick={() => setFormData(prev => ({ ...prev, hasParking: !prev.hasParking }))}
                  className="flex items-center justify-between p-4 rounded-lg border border-[#314368] bg-[#182234] h-20 cursor-pointer hover:border-[#314368]/80 transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="text-white text-sm md:text-base font-medium">Parking Available</span>
                    <span className="text-[#90a4cb] text-xs">Can attendees park on-site?</span>
                  </div>
                  {}
                  <div className={`w-11 h-6 rounded-full relative transition-colors ${formData.hasParking ? 'bg-[#0d59f2]' : 'bg-gray-700'}`}>
                    <div className={`absolute top-[2px] left-[2px] bg-white w-5 h-5 rounded-full transition-transform ${formData.hasParking ? 'translate-x-full' : ''}`}></div>
                  </div>
                </div>

                {}
                <div className="flex flex-col gap-2">
                  <label className="text-white text-sm font-medium">Bag Policy</label>
                  <input
                    name="bagPolicy"
                    type="text"
                    value={formData.bagPolicy}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-[#314368] bg-[#182234] h-20 px-4 text-white placeholder-[#90a4cb] focus:ring-2 focus:ring-[#0d59f2] focus:border-transparent outline-none transition-all"
                    placeholder="e.g., Clear Bags Only"
                  />
                </div>

                {}
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-white text-sm font-medium">Venue Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-[#314368] bg-[#182234] min-h-[140px] p-4 text-white placeholder-[#90a4cb] focus:ring-2 focus:ring-[#0d59f2] focus:border-transparent outline-none transition-all resize-y custom-scrollbar text-sm"
                    placeholder="Describe the venue, its history, acoustics, and what makes it unique for events..."
                  ></textarea>
                </div>
              </div>
            </div>

            {}
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-2 pb-2 border-b border-[#314368]/50">
                <ImageIcon className="w-5 h-5 text-[#0d59f2]" />
                <h3 className="text-base md:text-lg font-bold text-white">Media</h3>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-white text-sm font-medium">Venue Photo</label>
                <div className="w-full h-48 md:h-56 border-2 border-dashed border-[#314368] rounded-xl bg-[#182234]/30 hover:bg-[#182234] hover:border-[#0d59f2]/50 transition-all flex flex-col items-center justify-center cursor-pointer group relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-[#0d59f2]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#182234] border border-[#314368] flex items-center justify-center mb-4 group-hover:scale-110 group-hover:border-[#0d59f2] group-hover:text-[#0d59f2] transition-all z-10 shadow-lg">
                    <CloudUpload className="text-[#90a4cb] group-hover:text-[#0d59f2] w-6 h-6 md:w-8 md:h-8" />
                  </div>
                  <p className="text-white text-sm font-medium z-10 group-hover:text-[#0d59f2] transition-colors">Click to upload or drag and drop</p>
                  <p className="text-[#90a4cb] text-xs z-10 mt-1">SVG, PNG, JPG or GIF (max. 5MB)</p>
                </div>
              </div>
            </div>

          </div>

          {}
          <div className="flex items-center justify-end gap-3 px-5 py-4 md:px-6 md:py-5 border-t border-[#314368] bg-[#182234]/50 backdrop-blur rounded-b-xl shrink-0 z-10">
            <button
              onClick={onClose}
              className="px-4 md:px-6 h-10 md:h-12 rounded-lg border border-[#314368] text-[#90a4cb] hover:text-white hover:bg-[#182234] hover:border-gray-500 font-medium transition-all text-sm md:text-base"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveVenue}
              disabled={isSubmitting}
              className="px-6 md:px-8 h-10 md:h-12 rounded-lg bg-[#0d59f2] hover:bg-blue-600 text-white font-bold shadow-lg shadow-[#0d59f2]/25 hover:shadow-[#0d59f2]/40 active:scale-95 transition-all flex items-center gap-2 text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 md:w-5 md:h-5" />
                  Save Venue
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}