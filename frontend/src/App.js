import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// 🧩 Import Components
import Sidebar from './components/Sidebar';

// 📄 Import Pages
import HomePage from './pages/HomePage'; // 👈 1. IMPORT YOUR NEW HOME PAGE
import Login from './pages/Login';
import SalesManagerDashboard from './pages/SalesManagerDashboard';
import OrderHistory from './pages/OrderHistory';
import CreateOrder from './pages/CreateOrder';
import Settings from './pages/Settings';
import Dispatch from './pages/Dispatch';
import PickList from './pages/PickList';
import GatePass from './pages/GatePass';
import StockMovementHistory from './pages/StockMovementHistory';
import DamageReport from './pages/DamageReport';
import StoreKeeperInventoryPage from './pages/StoreKeeperInventoryPage';
import EquipmentPage from './pages/EquipmentPage';
import AisleMapPage from './pages/AisleMapPage';
import Customers from './pages/Customers';


// 🧠 THE SMART LAYOUT: This decides whether to show the Sidebar or not
function Layout() {
  const location = useLocation();
  // Read role from localStorage each render. Do not keep it only in useState:
  // after login, state updates in useEffect run too late, so the first protected
  // render would still see role=null and <Navigate> would bounce back to /login.
  const userRole = localStorage.getItem('role') || '';

  // 👈 2. RENAME TO 'isPublicPage' so it applies to BOTH Home and Login
  const isPublicPage = location.pathname === '/login' || location.pathname === '/';

  // If they are on a public page, ONLY show those routes (No Sidebar!)
  if (isPublicPage) {
    return (
      <Routes>
        <Route path="/" element={<HomePage />} /> {/* 👈 3. SET ROOT PATH TO HOMEPAGE */}
        <Route path="/login" element={<Login />} />
      </Routes>
    );
  }

  if (!userRole && !isPublicPage) {
    return <Navigate to="/login" />;
  }

  // If they are NOT on a public page, show the Dashboard with the Sidebar!
  return (
    <div style={{ display: 'flex' }}>
      
      <Sidebar /> {/* ⬅️ Sidebar stays on the left */}
      
      <div style={{ marginLeft: '250px', width: '100%', minHeight: '100vh', backgroundColor: '#f4f6f8' }}>
        <Routes>
          {/* Manager routes */}
          {userRole === 'SalesManager' && (
            <>
              <Route path="/approval-lobby" element={<SalesManagerDashboard />} />
              <Route path="/settings" element={<Settings />} />
            </>
          )}

          {/* Sales Officer routes */}
          {userRole === 'SalesOfficer' && (
            <>
              <Route path="/create-order" element={<CreateOrder />} />
              <Route path="/customers" element={<Customers />} />
            </>
          )}

          {/* Warehouse Manager routes */}
          {userRole === 'WarehouseManager' && (
            <>
              <Route path="/dispatch" element={<Dispatch />} />
              <Route path="/picklist" element={<PickList />} />
              <Route path="/gatepass" element={<GatePass />} />
              <Route path="/equipment" element={<EquipmentPage />} />
              <Route path="/aisles" element={<AisleMapPage />} />
              <Route path="/stock-movements" element={<StockMovementHistory />} />
              <Route path="/damage-report" element={<DamageReport />} />
            </>
          )}

          {/* Store Keeper routes */}
          {userRole === 'StoreKeeper' && (
            <>
              <Route path="/inventory" element={<StoreKeeperInventoryPage />} />
              <Route path="/equipment" element={<EquipmentPage />} />
              <Route path="/aisles" element={<AisleMapPage />} />
              <Route path="/stock-movements" element={<StockMovementHistory />} />
            </>
          )}

          {/* All users want routes */}
          <Route path="/order-history" element={<OrderHistory />} />

          {/* Catch-all route */}
          <Route path="*" element={<Navigate to={
            userRole === 'SalesManager' ? "/approval-lobby" : 
            userRole === 'SalesOfficer' ? "/create-order" : 
            userRole === 'StoreKeeper' ? "/inventory" : 
            userRole === 'WarehouseManager' ? "/dispatch" : "/login"
          } />} />
        </Routes>
      </div>
    </div>
  );
}

// 🚀 MAIN APP COMPONENT
function App() {
  return (
    <Router>
      <Layout />
      {/* The Toast speaker stays outside so it works on every page */}
      <ToastContainer position="bottom-right" autoClose={3000} theme="colored" />
    </Router>
  );
}

export default App;