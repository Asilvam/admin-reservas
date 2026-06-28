interface MetricCardProps {
  label: string;
  value: string | number;
  tone?: 'neutral' | 'good' | 'warning' | 'danger';
}

export function MetricCard({ label, value, tone = 'neutral' }: MetricCardProps) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
