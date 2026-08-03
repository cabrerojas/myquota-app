/**
 * Tests for WebChart — Platform.OS guard behavior.
 *
 * Strategy: Verify Platform.OS conditional rendering. The WebChart component
 * returns null on native and renders Recharts on web. Recharts integration
 * is validated via `npx expo export -p web` (build-time check).
 */

import React from "react";
import renderer, { act } from "react-test-renderer";
import { Platform } from "react-native";

// Mock recharts (DOM library — unavailable in jest-expo env).
// Must not reference React or View from outer scope in factory.
jest.mock("recharts", () => {
  const MockCmp = "MockComponent";
  return {
    __esModule: true,
    BarChart: MockCmp,
    Bar: MockCmp,
    XAxis: MockCmp,
    YAxis: MockCmp,
    CartesianGrid: MockCmp,
    Tooltip: MockCmp,
    ResponsiveContainer: MockCmp,
    PieChart: MockCmp,
    Pie: MockCmp,
    Cell: MockCmp,
    Legend: MockCmp,
  };
});

import { WebChart, BarChartData, PieChartData } from "./WebChart";

const BAR_DATA: BarChartData[] = [
  { label: "Ene", value: 1000 },
  { label: "Feb", value: 2000 },
];

const PIE_DATA: PieChartData[] = [
  { name: "Food", value: 5000, color: "#3B82F6" },
  { name: "Transport", value: 3000, color: "#EF4444" },
];

describe("WebChart", () => {
  const originalPlatform = Platform.OS;

  afterEach(() => {
    (Platform as any).OS = originalPlatform;
  });

  // ── NATIVE path tests (must return null) ──────────────────────────────────

  it("returns null on iOS — native chart-kit path preserved", () => {
    (Platform as any).OS = "ios";
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<WebChart data={BAR_DATA} type="bar" />);
    });
    expect(tree!.toJSON()).toBeNull();
  });

  it("returns null on Android — native chart-kit path preserved", () => {
    (Platform as any).OS = "android";
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<WebChart data={PIE_DATA} type="pie" />);
    });
    expect(tree!.toJSON()).toBeNull();
  });

  it("returns null on native with empty data", () => {
    (Platform as any).OS = "ios";
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<WebChart data={[]} type="bar" />);
    });
    expect(tree!.toJSON()).toBeNull();
  });

  // ── WEB path tests (must render without crashing) ────────────────────────

  it("renders without crashing on web for bar chart", () => {
    (Platform as any).OS = "web";
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<WebChart data={BAR_DATA} type="bar" />);
    });
    // On web, the component must render (not null, not crash)
    expect(tree!.toJSON()).not.toBeNull();
  });

  it("renders without crashing on web for pie chart", () => {
    (Platform as any).OS = "web";
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<WebChart data={PIE_DATA} type="pie" />);
    });
    expect(tree!.toJSON()).not.toBeNull();
  });

  it("renders empty View on web with empty data", () => {
    (Platform as any).OS = "web";
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<WebChart data={[]} type="bar" />);
    });
    // Empty data returns empty View (wrapped in View on web)
    expect(tree!.toJSON()).not.toBeNull();
  });
});
