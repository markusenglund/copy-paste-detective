import React, { useCallback, useEffect, useState } from "react";
import { Dashboard } from "./pages/Dashboard";
import { DatasetDetails } from "./pages/DatasetDetails";

type Route = { page: "dashboard" } | { page: "dataset"; datasetId: number };

function parseRoute(): Route {
  const path = window.location.pathname;
  const datasetMatch = path.match(/^\/dataset\/(\d+)$/);

  if (datasetMatch) {
    return { page: "dataset", datasetId: parseInt(datasetMatch[1], 10) };
  }

  return { page: "dashboard" };
}

function App(): React.ReactElement {
  const [route, setRoute] = useState<Route>(parseRoute);

  const navigateToDataset = useCallback((datasetId: number) => {
    window.history.pushState({}, "", `/dataset/${datasetId}`);
    setRoute({ page: "dataset", datasetId });
  }, []);

  const navigateToDashboard = useCallback(() => {
    window.history.pushState({}, "", "/");
    setRoute({ page: "dashboard" });
  }, []);

  useEffect(() => {
    const handlePopState = (): void => {
      setRoute(parseRoute());
    };

    window.addEventListener("popstate", handlePopState);
    return (): void => window.removeEventListener("popstate", handlePopState);
  }, []);

  if (route.page === "dataset") {
    return (
      <DatasetDetails
        datasetId={route.datasetId}
        onNavigateBack={navigateToDashboard}
      />
    );
  }

  return <Dashboard onNavigateToDataset={navigateToDataset} />;
}

export default App;
