import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import NewAnalysis from './pages/NewAnalysis';
import Analysis from './pages/Analysis';
import Dashboard from './pages/Dashboard';
import FraudReport from './pages/FraudReport';
import WarningSystem from './pages/WarningSystem';
import CamSuccess from './pages/CamSuccess';
import History from './pages/History';

/* 
  All inter-page navigation uses URL query params to carry the analysis ID:
  /analysis?id=2
  /dashboard?id=2
  /fraud-report?id=2
  /cam-success?id=2
  /warning-system?company_id=1&id=2
*/
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/new-analysis" element={<NewAnalysis />} />
        <Route path="/history" element={<History />} />
        <Route path="/analysis" element={<Analysis />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/fraud-report" element={<FraudReport />} />
        <Route path="/warning-system" element={<WarningSystem />} />
        <Route path="/cam-success" element={<CamSuccess />} />
      </Routes>
    </Router>
  );
}

export default App;
