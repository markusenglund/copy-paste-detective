import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { DatasetDetails } from "./pages/DatasetDetails";
import { Statistics } from "./pages/Statistics";
import { Header } from "./components/Header";

function App(): React.ReactElement {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dataset/:datasetId" element={<DatasetDetails />} />
        <Route path="/statistics" element={<Statistics />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
