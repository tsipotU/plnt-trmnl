import { Routes, Route } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard.js';
import { AddPlant } from './pages/AddPlant.js';
import { PlantDetail } from './pages/PlantDetail.js';
import { TrmnlPreview } from './pages/TrmnlPreview.js';
import { TrmnlSetup } from './pages/TrmnlSetup.js';
import { FeedbackList } from './pages/FeedbackList.js';
import { FeedbackDetail } from './pages/FeedbackDetail.js';
import { ArchivedPlants } from './pages/ArchivedPlants.js';
import { Settings } from './pages/Settings.js';
import { About } from './pages/About.js';
import { Header } from './components/nav/Header.js';
import { FeedbackButton } from './components/FeedbackButton.js';
import { DialogProvider } from './context/DialogContext.js';

export function App() {
  return (
    <DialogProvider>
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <Header />
        <main style={{ flex: 1, padding: 16 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/plants/:id" element={<PlantDetail />} />
            <Route path="/add" element={<AddPlant />} />
            <Route path="/preview" element={<TrmnlPreview />} />
            <Route path="/setup" element={<TrmnlSetup />} />
            <Route path="/archived" element={<ArchivedPlants />} />
            <Route path="/feedback" element={<FeedbackList />} />
            <Route path="/feedback/:id" element={<FeedbackDetail />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </main>
        <FeedbackButton />
      </div>
    </DialogProvider>
  );
}
