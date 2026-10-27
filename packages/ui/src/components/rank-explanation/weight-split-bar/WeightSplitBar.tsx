export type WeightSplitBarProps = { assessmentWeightPercent: number }
export function WeightSplitBar({ assessmentWeightPercent: w }: WeightSplitBarProps) {
  return (
    <div
      role="img"
      aria-label={`${w}% club assessments, ${100 - w}% match performance`}
      className="flex h-3.5 gap-0.5 overflow-hidden rounded-full"
    >
      <span className="bg-accent" style={{ flex: w }} />
      <span className="bg-accent/35" style={{ flex: 100 - w }} />
    </div>
  )
}
