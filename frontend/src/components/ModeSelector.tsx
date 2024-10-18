import React, { useRef, useState, useCallback } from "react";
import { ZoomIn, GitCompare, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ModeSelectorProps {
  mode: "zoom" | "difference" | "view";
  setMode: React.Dispatch<React.SetStateAction<"zoom" | "difference" | "view">>;
}

/**
 * ModeSelector component for selecting graph mode
 */
const ModeSelector: React.FC<ModeSelectorProps> = ({ mode, setMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const modes = [
    { name: "zoom", Icon: ZoomIn },
    { name: "difference", Icon: GitCompare },
    { name: "view", Icon: Eye },
  ];

  const CurrentIcon = modes.find(m => m.name === mode)?.Icon || ZoomIn;

  const handleMouseEnter = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsOpen(true);
  }, []);

  const handleMouseLeave = useCallback((e: React.MouseEvent) => {
    const container = containerRef.current;
    const relatedTarget = e.relatedTarget as Node;

    if (container && !container.contains(relatedTarget)) {
      timeoutRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 300);
    }
  }, []);

  const handleModeChange = useCallback((newMode: "zoom" | "difference" | "view") => {
    setMode(newMode);
    setIsOpen(false);
  }, [setMode]);

  return (
    <div className="relative" ref={containerRef}>
      <motion.div
        className="relative z-50 flex justify-center"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <motion.div
          className="p-2 rounded-full text-primary-foreground cursor-pointer"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <CurrentIcon size={24} />
            </motion.div>
          </AnimatePresence>
        </motion.div>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full rounded-lg p-2 flex flex-col space-y-2"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {modes.filter(m => m.name !== mode).map(({ name, Icon }) => (
                <motion.button
                  key={name}
                  className="p-2 rounded-full text-secondary-foreground w-full"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleModeChange(name as "zoom" | "difference" | "view")}
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={name}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Icon size={20} />
                    </motion.div>
                  </AnimatePresence>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ModeSelector;
