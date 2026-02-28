import PageContainer from "./PageContainer";
import Section from "./Section";

/**
 * DashboardLayout — structural scaffold for the Training Dashboard.
 * All slot props are optional; omit any slot to hide that section.
 *
 * Usage:
 *   <DashboardLayout
 *     header={<...filters...>}
 *     kpis={<...kpi cards...>}
 *     charts={<...chart grid...>}
 *     insights={<...insight cards...>}
 *     activities={<...activities table...>}
 *   />
 */
export default function DashboardLayout({
  header,
  kpis,
  charts,
  insights,
  activities,
}) {
  return (
    <PageContainer>
      {header && <div>{header}</div>}
      {kpis && <Section title="Overview">{kpis}</Section>}
      {charts && <Section title="Weekly Progression">{charts}</Section>}
      {insights && <Section title="Insights">{insights}</Section>}
      {activities && (
        <Section title="Latest Activities">{activities}</Section>
      )}
    </PageContainer>
  );
}
