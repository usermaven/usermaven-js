// @ts-ignore
import { useUsermaven, usePageView } from "./hooks/useUsermaven.tsx";
import { Route, Routes } from "react-router-dom";
import React, { useEffect } from "react";
import "./App.css";
// @ts-ignore
import Embed from "./components/Embed.tsx";
// @ts-ignore
import AutoCapture from "./components/AutoCapture.tsx";
import { useNavigate } from "react-router";

const usermavenOpts = {
  key: "js.ww3ozarcdmmpvg0gbxk3.z08avb6a1epld7b67j4czs",
  tracking_host: "https://eventcollectors.usermaven.com",
  autocapture: true,
  log_level: "DEBUG",
};

const App = () => {
  const { usermaven } = useUsermaven(usermavenOpts);
  const navigate = useNavigate();
  usePageView(usermaven);

  useEffect(() => {
    usermaven.id({
      // Required attributes
      id: "61caea525265a849dd7c2722", // Unique ID for the user in database.
      email: "zaryab.shahbaz@d4interactive.io", // Email address for the user.

      // Recommended attributes
      created_at: "2021-01-20", // DateTime string in your system that represents when
      // the user first signed up.
      first_name: "Muhammad", // Add any attributes you'd like to use in the email subject or body.
      last_name: "Shahbaz", // First name and last name are shown on people pages.

      // Example attributes (you can name attributes what you wish)
      custom: {
        current_plan: "replug-agency-lifetime",
        subscription_id: "5afa74ea9bca157d4121b1d4",
      },
      // Company Attributes
      company: {
        // Required Attributes
        id: "61caea525265a849dd7c2722", // Company ID
        name: "Muhammad Zaryaab Shahbaz", // Company Name.
        created_at: "2022-02-02",

        // Optional attributes such as industry, website, employee count etc.
        custom: {
          industry: "Technology", // Company Industry.
          website: "https://usermaven.com", // Company Website.
          employees: 20, // Number of employees.
          plan: "enterprise", // Company Plan.
        },
      },
    });
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <p>
          <code>Usermaven SDK</code>
        </p>
        <p>Check console for tracker events</p>
        <ul>
          <li>
            <label onClick={() => navigate("/")}>Session Persistence</label>
          </li>
          <li>
            <label onClick={() => navigate("autocapture")}>Autocapturing</label>
          </li>
        </ul>
        <Routes>
          <Route path="/" element={<Embed />} />
          <Route path="/autocapture" element={<AutoCapture />} />
        </Routes>
      </header>
    </div>
  );
};

export default App;
