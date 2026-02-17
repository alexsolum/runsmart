import { useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import LegacyModals from './components/LegacyModals';
import HeroPage from './pages/HeroPage';
import PlanningPage from './pages/PlanningPage';
import InsightsPage from './pages/InsightsPage';
import DataPage from './pages/DataPage';
import CoachPage from './pages/CoachPage';
import RoadmapPage from './pages/RoadmapPage';
import HtmlSection from './components/HtmlSection';
import markup from './legacy/markup';
import { loadLegacyScripts } from './legacy/loadLegacyScripts';

export default function App() {
  useEffect(() => {
    loadLegacyScripts();
  }, []);

  return (
    <>
      <Sidebar />
      <HtmlSection html={markup.overlay} />
      <div className="main-wrapper">
        <Topbar />
        <HeroPage />
        <PlanningPage />
        <InsightsPage />
        <DataPage />
        <CoachPage />
        <RoadmapPage />
        <HtmlSection html={markup.footer} />
      </div>
      <LegacyModals />
    </>
  );
}
