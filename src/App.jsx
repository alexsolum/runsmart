import { useEffect } from "react";
import { AppDataProvider, useAppData } from "./context/AppDataContext";

function Dashboard() {
  const { auth, plans, activities, checkins } = useAppData();

  useEffect(() => {
    if (!auth.user) return;
    plans.loadPlans();
    activities.loadActivities({ limit: 20, ascending: false });
    checkins.loadCheckins();
  }, [auth.user, plans, activities, checkins]);

  if (auth.loading) return <p>Laster bruker...</p>;
  if (!auth.user) return <p>Logg inn for å se data.</p>;

  return (
    <section>
      <h2>{auth.user.email}</h2>
      <p>Planer: {plans.plans.length}</p>
      <p>Aktiviteter: {activities.activities.length}</p>
      <p>Check-ins: {checkins.checkins.length}</p>
      {(plans.error || activities.error || checkins.error) && <p>Kunne ikke laste alt innhold.</p>}
    </section>
  );
}

export default function App() {
  return (
    <AppDataProvider>
      <Dashboard />
    </AppDataProvider>
  );
}
