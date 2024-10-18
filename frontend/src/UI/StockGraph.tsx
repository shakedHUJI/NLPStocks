import React, { useRef, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  ReferenceArea,
  ReferenceDot,
  Legend,
} from "recharts";
import { TrendingUp, ZoomIn, GitCompare, Eye } from "lucide-react";
import CustomTooltip from "../components/CustomTooltip";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./button.tsx";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "./card.tsx";

interface StockGraphProps {
  stockData: any[];
  stockSymbols: string[];
  colorMap: { [key: string]: string };
  description: string;
  keyDates: any[];
  compareMode: boolean;
  zoomState: any;
  setZoomState: React.Dispatch<React.SetStateAction<any>>;
  handleZoom: () => void;
  handleDoubleClick: (event: React.MouseEvent) => void;
  onClose: () => void;
  theme: string;
  isDifferenceMode: boolean;
  toggleDifferenceMode: () => void;
}

const ModeSelector = ({ mode, setMode }) => {
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

  return (
    <div className="relative" ref={containerRef}>
      <motion.div
        className="relative z-50 flex justify-center"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <motion.div
          className="p-2 rounded-full text-primary-foreground shadow-lg"
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
                  onClick={() => setMode(name)}
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
const StockGraph: React.FC<StockGraphProps> = ({
  stockData,
  stockSymbols,
  colorMap,
  keyDates,
  compareMode,
  zoomState,
  setZoomState,
  handleZoom,
  handleDoubleClick,
  theme,
}) => {
  const chartRef = useRef<any>(null);
  const [selectionStart, setSelectionStart] = useState<any>(null);
  const [mode, setMode] = useState<"zoom" | "difference" | "view">("difference");

  const getGraphTitle = () => {
    if (compareMode) {
      return `${stockSymbols.join(" vs ")} Comparison`;
    } else {
      return stockSymbols.length === 1
        ? `${stockSymbols[0]} Stock Performance`
        : `${stockSymbols.join(", ")} Stock Performance`;
    }
  };

  const handleSelectionStart = (e: any) => {
    if (!e || mode === "view") return;
    const { activeLabel, activePayload } = e;
    if (activeLabel && activePayload) {
      setSelectionStart({ date: activeLabel, values: activePayload });
      setZoomState((prev) => ({
        ...prev,
        refAreaLeft: activeLabel,
      }));
    }
  };

  const handleSelectionMove = (e: any) => {
    if (!e || mode === "view") return;
    const { activeLabel } = e;
    if (activeLabel) {
      setZoomState((prev) => ({
        ...prev,
        refAreaRight: activeLabel,
      }));
    }
  };

  const handleSelectionEnd = () => {
    if (mode === "view") return;
    if (mode === "difference") {
      setSelectionStart(null);
    } else if (mode === "zoom") {
      handleZoom();
    }
    setZoomState((prev) => ({
      ...prev,
      refAreaLeft: "",
      refAreaRight: "",
    }));
  };

  const toggleMode = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent the default right-click menu
    setMode((prevMode) => {
      switch (prevMode) {
        case "zoom":
          return "difference";
        case "difference":
          return "view";
        case "view":
          return "zoom";
      }
    });
  };

  return (
    <Card className="min-w-[300px] w-full relative">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <TrendingUp className="mr-2 h-6 w-6 text-primary" />
            {getGraphTitle()}
          </div>
          <ModeSelector mode={mode} setMode={setMode} />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="w-full h-[400px] select-none"
          onDoubleClick={handleDoubleClick}
          onContextMenu={toggleMode}
          ref={chartRef}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={stockData}
              margin={{ top: 20, right: 20, left: 0, bottom: 60 }}
              onMouseDown={handleSelectionStart}
              onMouseMove={handleSelectionMove}
              onMouseUp={handleSelectionEnd}
              onTouchStart={handleSelectionStart}
              onTouchMove={handleSelectionMove}
              onTouchEnd={handleSelectionEnd}
            >
              <defs>
                {stockSymbols.map((symbol) => (
                  <linearGradient
                    key={symbol}
                    id={`color${symbol}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={colorMap[symbol]}
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor={colorMap[symbol]}
                      stopOpacity={0}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
              <XAxis
                dataKey="date"
                stroke={theme === "dark" ? "#fff" : "#888"}
                style={{ fontSize: "0.1rem" }}
                tick={({ x, y, payload }) => (
                  <g transform={`translate(${x},${y})`}>
                    <text
                      x={0}
                      y={0}
                      dy={16}
                      textAnchor="end"
                      fill={theme === "dark" ? "#fff" : "#888"}
                      transform="rotate(-35)"
                      fontSize="0.6rem"
                    >
                      {payload.value}
                    </text>
                  </g>
                )}
                height={60}
                interval="preserveStartEnd"
                allowDataOverflow
                domain={["dataMin", "dataMax"]}
              />
              <YAxis
                stroke={theme === "dark" ? "#fff" : "#888"}
                style={{ fontSize: "0.6rem" }}
                width={40}
                allowDataOverflow
              />
              <RechartsTooltip
                content={({ active, payload, label }) => (
                  <CustomTooltip
                    active={active}
                    payload={payload}
                    label={label}
                    keyDates={keyDates}
                    colors={colorMap}
                    stockData={stockData}
                    isDifferenceMode={mode === "difference"}
                    selectionStart={selectionStart}
                  />
                )}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{
                  paddingTop: "20px",
                  fontSize: "0.8rem",
                }}
                formatter={(value) => (
                  <span style={{ color: colorMap[value] }}>{value}</span>
                )}
              />
              {stockSymbols.map((symbol) => (
                <Area
                  key={symbol}
                  type="monotone"
                  dataKey={symbol}
                  stroke={colorMap[symbol]}
                  fillOpacity={1}
                  fill={`url(#color${symbol})`}
                />
              ))}
              {keyDates.map((keyDate, index) => {
                const dataPoint = stockData.find(
                  (item) => item.date === keyDate.date
                );
                return dataPoint ? (
                  <ReferenceDot
                    key={index}
                    x={keyDate.date}
                    y={dataPoint[keyDate.symbol]}
                    r={4}
                    fill="red"
                    fillOpacity={0.5}
                    stroke="none"
                  />
                ) : null;
              })}
              {zoomState.refAreaLeft && zoomState.refAreaRight ? (
                <ReferenceArea
                  x1={zoomState.refAreaLeft}
                  x2={zoomState.refAreaRight}
                  strokeOpacity={0.3}
                  fill="#8884d8"
                  fillOpacity={0.3}
                />
              ) : null}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default StockGraph;
