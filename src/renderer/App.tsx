import { MemoryRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css';
import Admin from './Components/Admin';
import Standings from './Components/Standings';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Standings />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Router>
  );
}
