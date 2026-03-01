import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PetWindow } from "./pet/PetWindow";
import { ChatWindow } from "./chat/ChatWindow";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/pet" element={<PetWindow />} />
        <Route path="/chat" element={<ChatWindow />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
