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
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "./card.tsx";
import { TrendingUp } from "lucide-react";
import CustomTooltip from "../components/CustomTooltip";
import { Button } from "./button.tsx";

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
  onClose,
  theme,
  isDifferenceMode,
  toggleDifferenceMode,
}) => {
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const chartRef = useRef<any>(null);
  const [selectionStart, setSelectionStart] = useState<any>(null);

  const getGraphTitle = () => {
    if (compareMode) {
      return `${stockSymbols.join(" vs ")} Comparison`;
    } else {
      return stockSymbols.length === 1
        ? `${stockSymbols[0]} Stock Performance`
        : `${stockSymbols.join(", ")} Stock Performance`;
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStartX(touch.clientX);
    setZoomState((prev) => ({
      ...prev,
      refAreaLeft: getDataIndexFromTouch(touch),
    }));
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX !== null) {
      const touch = e.touches[0];
      setZoomState((prev) => ({
        ...prev,
        refAreaRight: getDataIndexFromTouch(touch),
      }));
    }
  };

  const handleTouchEnd = () => {
    if (zoomState.refAreaLeft && zoomState.refAreaRight) {
      handleZoom();
    }
    setTouchStartX(null);
  };

  const getDataIndexFromTouch = (touch: React.Touch) => {
    if (chartRef.current) {
      const chart = chartRef.current;
      const chartRect = chart.getBoundingClientRect();
      const xAxis = chart.querySelector(".recharts-xAxis");
      const xAxisRect = xAxis.getBoundingClientRect();
      const touchX = touch.clientX - chartRect.left;
      const xAxisWidth = xAxisRect.width;
      const dataLength = stockData.length;
      const index = Math.round((touchX / xAxisWidth) * (dataLength - 1));
      return stockData[index].date;
    }
    return null;
  };

  const handleSelectionStart = (e: any) => {
    if (!e) return;
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
    if (!e) return;
    const { activeLabel } = e;
    if (activeLabel && (isDifferenceMode || !isDifferenceMode)) {
      setZoomState((prev) => ({
        ...prev,
        refAreaRight: activeLabel,
      }));
    }
  };

  const handleSelectionEnd = () => {
    if (isDifferenceMode) {
      setSelectionStart(null);
    } else {
      handleZoom();
    }
    setZoomState((prev) => ({
      ...prev,
      refAreaLeft: "",
      refAreaRight: "",
    }));
  };

  return (
    <Card toggleable defaultOpen className="min-w-[300px] w-full relative">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <TrendingUp className="mr-2 h-6 w-6 text-blue-500" />
            {getGraphTitle()}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="w-full h-[400px] select-none"
          onDoubleClick={handleDoubleClick}
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
                      fontSize="0.6rem" // Reduced from 0.7rem to 0.5rem
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
                    isDifferenceMode={isDifferenceMode}
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
                formatter={(value, entry) => (
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
      <CardFooter className="flex justify-center mt-4">
        <Button
          onClick={toggleDifferenceMode}
          variant={isDifferenceMode ? "default" : "outline"}
          size="sm"
        >
          {isDifferenceMode ? "Zoom Mode" : "Difference Mode"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default StockGraph;
