// src/App.jsx

import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./messpages/Login";
import Home from "./messpages/Home"; // Your homepage component
import Stats from "./messpages/stats";
import AdminLogin from "./cafepages/AdminLogin";
import AdminDashboard from "./cafepages/AdminDashboard";
import AuntysCafe from "./cafepages/AuntysCafe";

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
        
      </Routes>
    </Router>
  );
}

export default App;
