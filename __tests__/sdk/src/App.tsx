import { useUsermaven, usePageView } from "./hooks/useUsermaven.tsx";
import React, { useEffect } from "react";
import './App.css';

const usermavenOpts = {
  key: "js.ww3ozarcdmmpvg0gbxk3.z08avb6a1epld7b67j4czs",
  tracking_host: "https://eventcollectors.usermaven.com",
};

const App = () => {
  const { usermaven } = useUsermaven(usermavenOpts);
  usePageView(usermaven);

  useEffect(() => usermaven.account('some-account-id', { properties: 'random-ones-optional' }), [])

  return (
    <div className="App">
      <header className="App-header">
        <p><code>Usermaven SDK</code></p>
        <p>Check console for tracker events</p>
      </header>
    </div>
  );
}

export default App;
