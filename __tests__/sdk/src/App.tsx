import { useUsermaven, usePageView } from "./hooks/useUsermaven.tsx";
import React from "react";
import { Route, Routes } from "react-router-dom";
import './App.css';
import Embed from "./components/Embed.tsx";
import AutoCapture from "./components/AutoCapture.tsx";
import { useNavigate } from "react-router";

const usermavenOpts = {
  key: "js.ww3ozarcdmmpvg0gbxk3.z08avb6a1epld7b67j4czs",
  tracking_host: "https://eventcollectors.usermaven.com",
};

const App = () => {
  const { usermaven } = useUsermaven(usermavenOpts);
  const navigate = useNavigate();
  usePageView(usermaven);

  return (
    <div className="App">
      <header className="App-header">
        <p><code>Usermaven SDK</code></p>
        <p>Check console for tracker events</p>
        <ul>
          <li><label onClick={() => navigate('/')}>Session Persistence</label></li>
          <li><label onClick={() => navigate('autocapture')}>Autocapturing</label></li>
        </ul>
        <Routes>
          <Route path="/" element={<Embed />} />
          <Route path="/autocapture" element={<AutoCapture />} />
        </Routes>
      </header >
    </div >
  );
}

export default App;
