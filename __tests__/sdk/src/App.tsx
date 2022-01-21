import { useUsermaven, usePageView } from "./hooks/useUsermaven.tsx";
import React, { useState } from "react";
import './App.css';

const usermavenOpts = {
  key: "js.ww3ozarcdmmpvg0gbxk3.z08avb6a1epld7b67j4czs",
  tracking_host: "https://eventcollectors.usermaven.com",
};

const App = () => {
  const { usermaven } = useUsermaven(usermavenOpts);
  const [input, setInput] = useState("usermaven")
  usePageView(usermaven);

  return (
    <div className="App">
      <header className="App-header">
        <p><code>Usermaven SDK</code></p>
        <p>Check console for tracker events</p>
        <h3>Achor Tag</h3>
        <a id="anchor-test" name="anchor-test" target="_blank" href="https://google.com">Redirect</a>

        <h3>Button Tag</h3>
        <button id="button-test" name="button-test">Simple button</button>

        <h3>Form Tag | <small>Submission test</small></h3>
        <form id="form-test" name="form-test">
          <button name="submit-test" type="submit" value="form-submission">Submit</button>
        </form>

        <h3>Input Tag</h3>
        <input id="input-test" name="input-test" value={input} onChange={(e) => setInput(e.target.value)} />

        <h3>Label Tag</h3>
        <label id="label-test" name="label-test">Select tool</label>

        <h3>Select Tag</h3>
        <select id="select-test" name="select-test">
          <option value="replug">Replug</option>
          <option value="contentstudio">ContentStudio</option>
          <option value="usermaven">Usermaven</option>
        </select>

        <h3>Textarea Tag</h3>
        <textarea id="textarea-test" name="textarea-test"></textarea>

        <h3>No Capture Button Tag<small>
          <pre>um-no-capture</pre>
        </small></h3>
        <button id="button-test" name="button-test" className="um-no-capture" target="_blank">Simple button</button>
      </header >
    </div >
  );
}

export default App;
