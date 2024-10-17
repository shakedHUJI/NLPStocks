import React from "react";
import { parseISO, isWithinInterval, subDays, addDays, differenceInDays } from "date-fns";

const CustomTooltip = ({ active, payload, label, keyDates, colors, stockData, isDifferenceMode, selectionStart }) => {
  if (active && payload && payload.length) {
    const currentDate = parseISO(label);
    
    // Calculate the total date range of the graph
    const startDate = parseISO(stockData[0].date);
    const endDate = parseISO(stockData[stockData.length - 1].date);
    const totalDays = differenceInDays(endDate, startDate);
    
    // Calculate the number of days that represent 2% of the total range
    const daysBuffer = Math.ceil(totalDays * 0.02);

    const relevantKeyDates = keyDates.filter((keyDate) => {
      const keyDateParsed = parseISO(keyDate.date);
      return isWithinInterval(currentDate, {
        start: subDays(keyDateParsed, daysBuffer),
        end: addDays(keyDateParsed, daysBuffer),
      });
    });

    const calculateDifference = (currentValue, startValue) => {
      const diff = currentValue - startValue;
      const percentage = ((diff / startValue) * 100).toFixed(2);
      return `${diff.toFixed(2)} (${percentage}%)`;
    };

    return (
      <div className="bg-white bg-opacity-85 dark:bg-gray-800 dark:bg-opacity-75 p-4 rounded-lg shadow-lg">
        <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">{`Date: ${label}`}</p>
        {relevantKeyDates.map((keyDate, index) => (
          <p
            key={index}
            className="text-sm mt-2 text-red-600 dark:text-red-400 font-bold"
          >
            {`${keyDate.symbol} (${keyDate.date}): ${keyDate.description}`}
          </p>
        ))}
        {payload.map((entry, index) => (
          <p
            key={index}
            className="text-sm"
            style={{ color: colors[entry.name] }}
          >
            {`${entry.name}: $${entry.value.toFixed(2)}`}
            {isDifferenceMode && selectionStart && (
              <span className="ml-2">
                Diff: {calculateDifference(entry.value, selectionStart.values[index].value)}
              </span>
            )}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default CustomTooltip;
