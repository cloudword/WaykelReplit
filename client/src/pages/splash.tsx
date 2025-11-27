import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import mapImage from "@assets/generated_images/abstract_dotted_map_of_india.png";

export default function SplashScreen() {
  const [_, setLocation] = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setLocation("/auth");
    }, 3000);

    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center relative overflow-hidden">
      {/* Logo Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="z-10 text-center"
      >
        <h1 className="text-5xl font-black tracking-tighter mb-1">
          WAY<span className="text-primary">KEL</span>
        </h1>
      </motion.div>

      {/* Tagline Section */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="z-10 text-center mt-12 space-y-1"
      >
        <p className="text-xl font-bold text-black">More Loads.</p>
        <p className="text-xl font-bold text-black">
          Routes. <span className="text-primary">Earnings.</span>
        </p>
        <p className="text-xl font-black text-primary uppercase tracking-wide mt-2">PAN INDIA</p>
      </motion.div>

      {/* Map Graphic */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8, duration: 1 }}
        className="mt-16 w-full max-w-xs relative"
      >
        <img 
          src={mapImage} 
          alt="Map of India" 
          className="w-full h-auto opacity-80 mix-blend-multiply"
        />
        
        {/* Animated Location Markers */}
        <motion.div 
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="absolute top-1/3 left-1/3 text-red-600"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="drop-shadow-md">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </motion.div>

        <motion.div 
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-1/3 right-1/3 text-primary"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="drop-shadow-md">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </motion.div>
        
        {/* Dotted Connection Line (CSS SVG) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: -1 }}>
           <path d="M100,120 Q150,150 200,200" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 4" />
        </svg>
      </motion.div>
    </div>
  );
}
