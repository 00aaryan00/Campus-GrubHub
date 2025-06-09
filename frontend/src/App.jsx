// src/App.jsx

import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./messpages/Login";
import Home from "./messpages/Home"; // Your homepage component
import Stats from "./messpages/stats";


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/stats" element={<Stats />} />
        
      </Routes>
    </Router>
  );
}

export default App;
