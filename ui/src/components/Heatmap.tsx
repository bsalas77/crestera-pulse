interface HeatmapRisk {
  id: string;
  category: string;
  title: string;
  residual_score: number | string | null;
}

interface HeatmapProps {
  risks: HeatmapRisk[];
}

function scoreColor(score: number): string {
  if (score >= 7) return "#b91c1c";
  if (score >= 5) return "#d97706";
  if (score >= 3) return "#ca8a04";
  return "#15803d";
}

export function Heatmap({ risks }: HeatmapProps) {
  const byCategory = risks.reduce<Record<string, HeatmapRisk[]>>((acc, risk) => {
    (acc[risk.category] ??= []).push(risk);
    return acc;
  }, {});

  return (
    <div className="heatmap">
      {Object.entries(byCategory).map(([category, items]) => (
        <div key={category} className="heatmap-row">
          <div className="heatmap-row-label">{category}</div>
          <div className="heatmap-cells">
            {items.map((risk) => {
              const score = typeof risk.residual_score === "string" ? parseFloat(risk.residual_score) : risk.residual_score ?? 0;
              return (
                <div
                  key={risk.id}
                  className="heatmap-cell"
                  style={{ backgroundColor: scoreColor(score) }}
                  title={`${risk.title} — residual score ${score}`}
                >
                  {score.toFixed(1)}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
