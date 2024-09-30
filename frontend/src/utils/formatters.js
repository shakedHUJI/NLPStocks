export const formatLargeNumber = (num) => {
  if (num >= 1e12) return (num / 1e12).toFixed(2) + "T";
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
  return num.toFixed(2);
};

export const formatPercentage = (num) => (num * 100).toFixed(2) + "%";

export const formatNumber = (num) => num.toFixed(2);