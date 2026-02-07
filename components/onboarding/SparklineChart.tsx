import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

interface SparklineChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showGradient?: boolean;
}

export function SparklineChart({
  data,
  width = 80,
  height = 32,
  color,
  showGradient = true,
}: SparklineChartProps) {
  const { path, gradientPath, lineColor } = useMemo(() => {
    if (!data || data.length < 2) {
      // Generate placeholder data if no data provided
      const placeholderData = Array.from({ length: 20 }, () =>
        Math.random() * 10 + 45
      );
      return calculatePath(placeholderData, width, height);
    }
    return calculatePath(data, width, height);
  }, [data, width, height]);

  // Determine color based on trend (first vs last value)
  const finalColor = color || lineColor;

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="sparklineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={finalColor} stopOpacity={0.3} />
            <Stop offset="100%" stopColor={finalColor} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        {/* Gradient fill area */}
        {showGradient && (
          <Path
            d={gradientPath}
            fill="url(#sparklineGradient)"
          />
        )}

        {/* Line */}
        <Path
          d={path}
          fill="none"
          stroke={finalColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

function calculatePath(data: number[], width: number, height: number) {
  const padding = 2;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Normalize data points to chart dimensions
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((value - min) / range) * chartHeight;
    return { x, y };
  });

  // Create smooth path using bezier curves
  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const tension = 0.3;

    const cp1x = prev.x + (curr.x - prev.x) * tension;
    const cp1y = prev.y;
    const cp2x = curr.x - (curr.x - prev.x) * tension;
    const cp2y = curr.y;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
  }

  // Create gradient fill path (closes the path at the bottom)
  const gradientPath = path +
    ` L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  // Determine color based on trend
  const isPositive = data[data.length - 1] >= data[0];
  const lineColor = isPositive ? '#00D09C' : '#FF6B6B';

  return { path, gradientPath, lineColor };
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});

/**
 * Generate deterministic sparkline data for a holding.
 * Uses a seeded pseudo-random number generator so the same holding
 * always produces the same chart shape (no more random noise on re-render).
 */
export function generateMockChartData(
  currentPrice: number,
  changePercent: number,
  points: number = 20,
  seed?: string
): number[] {
  const data: number[] = [];
  const startPrice = currentPrice / (1 + changePercent / 100);
  const priceRange = currentPrice - startPrice;

  // Simple seeded PRNG (deterministic based on seed)
  let hash = 0;
  const seedStr = seed || `${currentPrice}-${changePercent}`;
  for (let i = 0; i < seedStr.length; i++) {
    hash = ((hash << 5) - hash + seedStr.charCodeAt(i)) | 0;
  }
  const seededRandom = () => {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff;
    return (hash / 0x7fffffff);
  };

  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    // Deterministic noise based on seed
    const noise = (seededRandom() - 0.5) * Math.abs(priceRange) * 0.3;
    const trendValue = startPrice + priceRange * progress;
    data.push(trendValue + noise);
  }

  // Ensure last point matches current price
  data[data.length - 1] = currentPrice;

  return data;
}
