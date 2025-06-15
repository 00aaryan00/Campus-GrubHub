// src/App.jsx

import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./messpages/Login";
import Home from "./messpages/Home"; // Your homepage component
import Stats from "./messpages/stats";
import AdminLogin from "./cafepages/AdminLogin";
import AdminDashboard from "./cafepages/AdminDashboard";
import AuntysCafe from "./cafepages/AuntysCafe";
import AuntysCafePreOrder from './cafepages/AuntysCafePreOrder';
import AdminOrders from './cafepages/AdminOrders';
import UserOrderSummary from './cafepages/UserOrderSummary';
import VoteAnalytics from './cafepages/analysis';


function App() {
  return (
    <Router>
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
       

        
      </Routes>
    </Router>
  );
}

export default App;
