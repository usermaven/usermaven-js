import React, { useState } from "react";
import { useNavigate } from "react-router";

const AutoCapture = () => {
  const [input, setInput] = useState("usermaven");
  const navigate = useNavigate();
  return (
    <>
      <h3>Achor Tag</h3>
      <a id="anchor-test" target="_blank" onClick={() => navigate("/")}>
        Embedded Usermaven
      </a>

      <h3>Button Tag</h3>
      <button id="button-test" name="button-test">
        Simple button
      </button>

      <h3>
        Form Tag | <small>Submission test</small>
      </h3>
      <form id="form-test">
        <button name="submit-test" type="submit" value="form-submission">
          Submit
        </button>
      </form>

      <h3>Input Tag</h3>
      <input
        id="input-test"
        name="input-test"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <h3>Label Tag</h3>
      <label id="label-test">Select tool</label>

      <h3>Select Tag</h3>
      <select id="select-test" name="select-test">
        <option value="replug">Replug</option>
        <option value="contentstudio">ContentStudio</option>
        <option value="usermaven">Usermaven</option>
      </select>

      <h3>Textarea Tag</h3>
      <textarea
        data-usermaven-ac="yes"
        id="textarea-test"
        name="textarea-test"
      ></textarea>

      <h3>
        No Capture Button Tag
        <small>
          <pre>um-no-capture</pre>
        </small>
      </h3>
      <button id="button-test" name="button-test" className="um-no-capture">
        Simple button
      </button>
    </>
  );
};

export default AutoCapture;
