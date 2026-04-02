// src/App.jsx

import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
const Login = lazy(() => import("./features/mess/pages/Login"));
const Home = lazy(() => import("./features/mess/pages/Home"));
const Stats = lazy(() => import("./features/mess/pages/StatsPage"));
const AdminLogin = lazy(() => import("./features/cafe/pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./features/cafe/pages/AdminDashboard"));
const AuntysCafe = lazy(() => import("./features/cafe/pages/AuntysCafe"));
const AuntysCafePreOrder = lazy(() => import("./features/cafe/pages/AuntysCafePreOrder"));
const AdminOrders = lazy(() => import("./features/cafe/pages/AdminOrders"));
const UserOrderSummary = lazy(() => import("./features/cafe/pages/UserOrderSummary"));
const VoteAnalytics = lazy(() => import("./features/cafe/pages/VoteAnalytics"));
const AboutPage = lazy(() => import("./features/mess/pages/AboutPage"));


function App() {
  return (
    <Router>
      <Suspense fallback={<div className="p-6 text-center">Loading...</div>}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/home" element={<Home />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/auntys-cafe" element={<AuntysCafe />} />
          <Route path="/auntys-cafe/preorder" element={<AuntysCafePreOrder />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/my-orders" element={<UserOrderSummary />} />
          <Route path="/analytics" element={<VoteAnalytics />} />
          <Route path="/menu" element={<AuntysCafePreOrder />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
