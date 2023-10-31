import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { createClient, UsermavenProvider } from "@usermaven/react";
import { BrowserRouter } from "react-router-dom";

// initialize Jitsu client
const usermavenClient = createClient({
    tracking_host: "https://events.usermaven.com",
    key: "UMXLIktQsI"
});

// wrap our app with Jitsu provider
ReactDOM.render(
  <React.StrictMode>
    <UsermavenProvider client={usermavenClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </UsermavenProvider>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
