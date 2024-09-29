import React from "react";
import { parseISO, isWithinInterval, subDays, addDays } from "date-fns";

const CustomTooltip = ({ active, payload, label, keyDates, colors }) => {
  if (active && payload && payload.length) {
    const currentDate = parseISO(label);
    const relevantKeyDates = keyDates.filter((keyDate) => {
      const keyDateParsed = parseISO(keyDate.date);
      return isWithinInterval(currentDate, {
        start: subDays(keyDateParsed, 3),
        end: addDays(keyDateParsed, 3),
      });
    });

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
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default CustomTooltip;