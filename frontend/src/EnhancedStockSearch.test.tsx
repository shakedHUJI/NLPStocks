import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import EnhancedStockSearch from './StockSearch';
import { ThemeProvider } from 'next-themes';

// Explicitly import jest.mock
import { jest } from '@jest/globals';

// Mock the useStockSearch hook
jest.mock('./hooks/useStockSearch', () => ({
  __esModule: true,
  default: () => ({
    query: '',
    setQuery: jest.fn(),
    handleSubmit: jest.fn(),
    loading: false,
    loadingState: '',
    error: null,
    aiError: null,
    showGraph: false,
    stockData: [],
    stockSymbols: [],
    colorMap: {},
    description: '',
    keyDates: [],
    compareMode: false,
    zoomState: {},
    setZoomState: jest.fn(),
    handleZoom: jest.fn(),
    handleZoomOut: jest.fn(),
    metrics: {},
    newsData: [],
    aiAnalysisDescription: '',
    hasSearched: false,
    setShowGraph: jest.fn(),
    isDifferenceMode: false,
    toggleDifferenceMode: jest.fn(),
  }),
}));

// Mock the next-themes useTheme hook
jest.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: jest.fn(),
  }),
}));

const renderWithTheme = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {ui}
    </ThemeProvider>
  );
};

