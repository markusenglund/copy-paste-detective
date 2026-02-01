import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { DatasetDetails } from "./pages/DatasetDetails";

function App(): React.ReactElement {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dataset/:datasetId" element={<DatasetDetails />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
