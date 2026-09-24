import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TimeSeriesChart } from "./TimeSeriesChart";

describe("TimeSeriesChart", () => {
  it("says there is nothing to chart instead of drawing empty axes", () => {
    render(<TimeSeriesChart data={[]} emptyLabel="No loss events recorded" />);
    expect(screen.getByText("No loss events recorded")).toBeInTheDocument();
  });

  it("does not draw a trend from a single imported month", () => {
    render(<TimeSeriesChart data={[{ period: "2026-08", value: 99.97 }]} unit="%" />);
    expect(screen.getByText(/one month of data so far \(2026-08: 99\.97%\)/i)).toBeInTheDocument();
  });
});
