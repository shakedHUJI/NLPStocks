import React, { useRef, useState } from "react";
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
import { TrendingUp } from "lucide-react";
import CustomTooltip from "../components/CustomTooltip";
import ModeSelector from "../components/ModeSelector.tsx";
import { Card, CardHeader, CardTitle, CardContent } from "./card.tsx";

/**
 * Props for the StockGraph component
 */
interface StockGraphProps {
  stockData: any[]; // Array of stock data points
  stockSymbols: string[]; // Array of stock symbols to display
  colorMap: { [key: string]: string }; // Map of stock symbols to colors
  description: string; // Description of the graph
  keyDates: any[]; // Array of key dates to highlight on the graph
  compareMode: boolean; // Whether the graph is in compare mode
  zoomState: any; // Current zoom state of the graph
  setZoomState: React.Dispatch<React.SetStateAction<any>>; // Function to update zoom state
  handleZoom: () => void; // Function to handle zoom action
  handleDoubleClick: (event: React.MouseEvent) => void; // Function to handle double click
  onClose: () => void; // Function to close the graph
  theme: string; // Current theme (light/dark)
  isDifferenceMode: boolean; // Whether the graph is in difference mode
  toggleDifferenceMode: () => void; // Function to toggle difference mode
}

/**
 * StockGraph component for displaying stock data
 * @param props StockGraphProps
 */
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

  /**
   * Get the title for the graph based on the current mode and stock symbols
   */
  const getGraphTitle = () => {
    if (compareMode) {
      return `${stockSymbols.join(" vs ")} Comparison`;
    } else {
      return stockSymbols.length === 1
        ? `${stockSymbols[0]} Stock Performance`
        : `${stockSymbols.join(", ")} Stock Performance`;
    }
  };

  /**
   * Handle the start of a selection on the graph
   */
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

  /**
   * Handle the movement during a selection on the graph
   */
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

  /**
   * Handle the end of a selection on the graph
   */
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

  /**
   * Toggle between different graph modes (zoom, difference, view)
   */
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
              {/* Define gradients for each stock symbol */}
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
              {/* X-axis configuration */}
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
              {/* Y-axis configuration */}
              <YAxis
                stroke={theme === "dark" ? "#fff" : "#888"}
                style={{ fontSize: "0.6rem" }}
                width={40}
                allowDataOverflow
              />
              {/* Custom tooltip */}
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
              {/* Legend configuration */}
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
              {/* Render area for each stock symbol */}
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
              {/* Render key date markers */}
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
              {/* Render selection area for zooming */}
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
