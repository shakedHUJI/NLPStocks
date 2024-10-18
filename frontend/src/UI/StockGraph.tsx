import React, { useRef, useState, useEffect } from "react";
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

// At the top of the file, add these type definitions
type ZoomState = {
  refAreaLeft?: string;
  refAreaRight?: string;
};

type KeyDate = {
  date: string;
  symbol: string;
};

export default function StockGraph({
  stockData = [],
  stockSymbols = [],
  colorMap = {},
  keyDates = [] as KeyDate[],
  compareMode = false,
  zoomState = {} as ZoomState,
  setZoomState = (state: ZoomState | ((prevState: ZoomState) => ZoomState)) => {},
  handleZoom = () => {},
  handleDoubleClick = () => {},
  theme = "light",
}) {
  const chartRef = useRef<HTMLDivElement>(null)
  const [selectionStart, setSelectionStart] = useState<any>(null)
  const [mode, setMode] = useState<"zoom" | "difference" | "view">("difference")
  const [isInteracting, setIsInteracting] = useState(false)

  const getGraphTitle = () => {
    if (compareMode) {
      return `${stockSymbols.join(" vs ")} Comparison`
    } else {
      return stockSymbols.length === 1
        ? `${stockSymbols[0]} Stock Performance`
        : `${stockSymbols.join(", ")} Stock Performance`
    }
  }

  const handleSelectionStart = (e: any) => {
    if (!e || mode === "view") return
    const { activeLabel, activePayload } = e
    if (activeLabel && activePayload) {
      setSelectionStart({ date: activeLabel, values: activePayload })
      setZoomState((prev: ZoomState) => ({
        ...prev,
        refAreaLeft: activeLabel,
      }))
    }
    setIsInteracting(true)
  }

  const handleSelectionMove = (e: any) => {
    if (!e || mode === "view") return
    const { activeLabel } = e
    if (activeLabel) {
      setZoomState((prev: ZoomState) => ({
        ...prev,
        refAreaRight: activeLabel,
      }))
    }
  }

  const handleSelectionEnd = () => {
    if (mode === "view") return
    if (mode === "difference") {
      setSelectionStart(null)
    } else if (mode === "zoom") {
      handleZoom()
    }
    setZoomState((prev: ZoomState) => ({
      ...prev,
      refAreaLeft: undefined,
      refAreaRight: undefined,
    }))
    setIsInteracting(false)
  }

  const toggleMode = (e: React.MouseEvent) => {
    e.preventDefault()
    setMode((prevMode) => {
      switch (prevMode) {
        case "zoom":
          return "difference"
        case "difference":
          return "view"
        case "view":
          return "zoom"
      }
    })
  }

  useEffect(() => {
    const chartElement = chartRef.current
    if (chartElement) {
      let startY: number

      const handleTouchStart = (e: TouchEvent) => {
        startY = e.touches[0].clientY
      }

      const handleTouchMove = (e: TouchEvent) => {
        if (isInteracting) {
          e.preventDefault()
          return
        }

        const currentY = e.touches[0].clientY
        const deltaY = startY - currentY

        if (Math.abs(deltaY) > 10) {
          // Allow scrolling if the user has moved their finger more than 10px
          e.stopPropagation()
        } else {
          e.preventDefault()
        }
      }

      chartElement.addEventListener("touchstart", handleTouchStart, { passive: false })
      chartElement.addEventListener("touchmove", handleTouchMove, { passive: false })

      return () => {
        chartElement.removeEventListener("touchstart", handleTouchStart)
        chartElement.removeEventListener("touchmove", handleTouchMove)
      }
    }
  }, [isInteracting])

  return (
    <Card className="min-w-[300px] w-full relative">
      <CardHeader>
        <CardTitle className="flex items-center justify-between flex-wrap pr-12">
          <div className="flex items-center mb-2 sm:mb-0">
            <TrendingUp className="mr-2 h-6 w-6 text-primary" />
            {getGraphTitle()}
          </div>
        </CardTitle>
      </CardHeader>
      <div className="absolute top-4 right-4 z-10">
        <ModeSelector mode={mode} setMode={setMode} />
      </div>
      <CardContent>
        <div
          className="w-full h-[50vh] min-h-[400px] max-h-[600px] select-none"
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
                  (item: any) => item.date === keyDate.date
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
}
