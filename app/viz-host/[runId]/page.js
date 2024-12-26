'use client';

import React, {Suspense, lazy, useEffect, useState } from 'react';
import { useSnackbar } from '@components/SnackbarContext';

/**
 * Renders a visualizer component based on the provided handler name. This is a
 * dynamic lazy-loaded component.
 * @param {object} props - The props passed to the component.
 * @param {string} props.handlerName - The name of the handler to use for
 * rendering.
 */
const VizComponent = (props) => {
  const [module, handler] = props.handlerPath.split('.');
  const LazyVizComponent = lazy(async () => ({
    default: (await import(`@handlers/visualizer/${module}`))[handler],
  }));

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyVizComponent {...props} />
    </Suspense>
  );
};

/**
 * Renders the visualizer host page.
 * @param {object} props - The props passed to the component.
 * @param {object} props.params - The URL parameters.
 * @param {string} props.params.runId - The ID of the run to visualize.
 */
export default function VizHostPage({ params }) {
  const [runId, setRunId] = useState(null);
  const [runInfo, setRunInfo] = useState(null);
  const { showError } = useSnackbar();

  /**
   * Gets the run ID from the URL params.
   */
  useEffect(() => {
    const getUrlData = async () => {
      const runId_ = (await params)?.runId;
      setRunId(runId_);
    };
    getUrlData();
  }, []);

  /**
   * Loads the visualizer data from the API.
   */
  useEffect(() => {
    async function loadVisualizer() {
      try {
        const response = await fetch(`/api/infra/runs/get-viz-info?runId=${runId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const { runInfo } = await response.json();
        setRunInfo(runInfo);
      } catch (error) {
        showError(`Error running visualizer: ${error.message}`);
      }
    }

    if (!runId) return;

    loadVisualizer();
  }, [runId]);

  return (
    <div id="viz-content" className="h-full">
      {runInfo && <VizComponent handlerPath={runInfo.rs_visualizer} {...runInfo} />}
    </div>
  );
}
