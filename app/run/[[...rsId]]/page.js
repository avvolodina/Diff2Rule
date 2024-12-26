'use client';
import dynamic from 'next/dynamic';
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Split from 'split.js';
import {
  Button,
  IconButton,
  Stack,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Paper,
  Typography,
} from '@mui/material';
// NOTE: We need to use dynamic import here to avoid SSR issues
const Select = dynamic(() => import('@mui/material/Select'), { ssr: false });
import RefreshIcon from '@mui/icons-material/Refresh';
import { AdapterLuxon } from '@mui/x-date-pickers/AdapterLuxon';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AgGridReact } from 'ag-grid-react';
import { ruleSetFetchAllSelect } from '@api/ui/rule-sets/basic';
import { snapshotFetchAllSelect } from '@api/ui/snapshots/basic';
import { formatDateIso, rxDateFormatIso } from '@modules/utils';
import { runFetchAllMonitor, getRunById } from '@api/ui/runs/basic';
import { useSnackbar } from '@components/SnackbarContext';
import StatusCellRenderer from '@components/StatusCellRenderer';
import SubdirectoryArrowLeftIcon from '@mui/icons-material/SubdirectoryArrowLeft';
import PageviewIcon from '@mui/icons-material/Pageview';

/**
 * The main component for the Run page.  Displays the form to select a rule set
 * and run it, along with the run info and parameters.
 * @param {Object} params - The URL parameters.
 */
const RunPage = ({ params }) => {
  const router = useRouter();
  const [rsCache, setRsCache] = useState([]);
  const [snapshotCache, setSnapshotCache] = useState([]);
  const [ruleSetId, setRuleSetId] = useState(null);
  const [ruleSet, setRuleSet] = useState(null);
  const [runLabel, setRunLabel] = useState('');
  const labelInputRef = useRef(null);
  const [runNotes, setRunNotes] = useState('');
  const [paramValues, setParamValues] = useState({});
  const [rowData, setRowData] = useState([]);
  const { showSuccess, showError } = useSnackbar();

  /**
   * Defines the columns for the AgGrid table.
   */
  const columnDefs = useMemo(
    () => [
      { field: 'label', headerName: 'Label', flex: 2, autoHeight: true },
      {
        field: 'rs_id',
        headerName: 'Rule Set',
        flex: 1,
        // Uses the rule set cache to display the rule set name
        valueFormatter: (params) => {
          const rsCached = rsCache.find((rs) => rs.id == params.value);
          return rsCached?.name || '< Unknown >';
        },
        autoHeight: true,
      },
      {
        field: 'complete_ts',
        headerName: 'Completed / Message',
        flex: 2,
        autoHeight: true,
        // Renders the completed timestamp and the message inside JSON results,
        // separated by a <br/> if both are present.
        cellRenderer: (params) => {
          const completeTs = formatDateIso(params.value);
          const message = params.data.message;
          let combined = '';
          if (completeTs) {
            combined += completeTs;
          }
          if (message) {
            if (combined) {
              combined += '<br/>';
            }
            combined += message;
          }
          return <span dangerouslySetInnerHTML={{ __html: combined }} />;
        },
      },
      {
        field: 'status',
        headerName: 'Status',
        flex: 1,
        autoHeight: true,
        cellRenderer: StatusCellRenderer,
      },
      {
        headerName: 'Tools',
        filter: false,
        sortable: false,
        editable: false,
        cellRenderer: (params) => (
          <div className="flex items-center justify-center h-full">
            <IconButton
              title="Reuse run parameters"
              className="rounded bg-blue-500 hover:bg-blue-700 p-0.5"
              onClick={() => onReuseBtnClick(params.data)}
            >
              <SubdirectoryArrowLeftIcon className="text-white text-sm" />
            </IconButton>
            <IconButton
              title="View results"
              className="rounded bg-green-500 hover:bg-green-700 p-0.5 ml-1"
              onClick={() => onResultsBtnClick(params.data)}
              disabled={params.data.status !== 'Completed'}
            >
              <PageviewIcon className="text-white text-sm" />
            </IconButton>
          </div>
        ),
        flex: 0.5,
      },
    ],
    [rsCache]
  );

  /**
   * Initializes the splitter on mount.
   */
  useEffect(() => {
    Split(['.split-pane-left', '.split-pane-right'], {
      sizes: [50, 50],
      minSize: 400,
      gutterSize: 16,
      // NOTE: It started as a workaround for Split.js losing cursor style after
      // the first resize. And that was a problem. But now we ended up with a
      // custom designed gutter which is good.
      gutter: (index, direction) => {
        // Prevent creating a new gutter if one already exists
        const existingGutter = document.querySelector('.run-page-gutter');
        if (existingGutter) return existingGutter;

        const dummy = document.createElement('div');
        dummy.innerHTML = `
          <div class="run-page-gutter gutter gutter-${direction} cursor-col-resize grid grid-cols-[auto] p-[7px]">
            <div class="bg-gray-200"></div>
          </div>
        `;
        const gutter = dummy.querySelector('.gutter');

        return gutter;
      },
    });
  }, []);

  /**
   * Populates the caches, gets the rule set ID from the URL params, if any.
   */
  useEffect(() => {
    const fetchData = async () => {
      const [ruleSets, snapshots] = await Promise.all([ruleSetFetchAllSelect(), snapshotFetchAllSelect()]);

      setRsCache(ruleSets);
      setSnapshotCache(snapshots);

      const ruleSetId_ = (await params)?.rsId?.[0];
      setRuleSetId(ruleSetId_);
    };

    fetchData();
  }, []);

  /**
   * Fetches all rule set runs from the database.
   */
  const fetchRuns = async () => {
    const runs = await runFetchAllMonitor();
    setRowData(runs);
  };

  /**
   * Fetches all rule set runs from the database on mount.
   */
  useEffect(() => {
    fetchRuns();
  }, []);

  /**
   * Handles the "Reuse" button click. Fetches the selected run data and
   * populates the form with the run's parameters.
   * @param {Object} runData - The data of the run to reuse.
   */
  const onReuseBtnClick = useCallback(
    async (runData) => {
      try {
        const run = await getRunById(runData.id);
        if (!run) {
          showError(`Run with id ${runData.id} not found`);
          return;
        }

        setRuleSetId(run.rs_id);
        setRunLabel(run.label);
        setRunNotes(run.notes);
        setParamValues(run.args);
      } catch (error) {
        showError(`Error reusing run: ${error.message}`);
      }
    },
    [showError]
  );

  /**
   * Handles the "View results" button click. Navigates to the results page.
   * @param {Object} runData - The data of the run to view results for.
   */
  const onResultsBtnClick = useCallback(
    (runData) => {
      window.open(`/viz-host/${runData.id}`, '_blank');
    },
    []
  );

  /**
   * Handles the "Refresh" button click.
   * Refreshes the grid with the latest data from the database.
   */
  const onRefreshBtnClick = useCallback(async () => {
    fetchRuns();
  }, []);

  /**
   * Sets the global rule set from either the URL params or the dropdown
   * selection.
   */
  useEffect(() => {
    if (!ruleSetId || !rsCache) return;

    const rsCached = rsCache.find((ruleSet) => ruleSet.id == ruleSetId);
    if (!rsCached) return;

    setRuleSet(rsCached);

    // Change the URL without reloading the page
    window.history.replaceState(null, '', `/run/${ruleSetId}`);
  }, [ruleSetId, rsCache]);

  /**
   * An array of form fields for the rule set parameters.
   */
  const paramsForm =
    ruleSet?.params &&
    ruleSet.params.map((param) => (
      <div key={param.name} className="grid grid-cols-[1fr_2fr] gap-4 items-center">
        <label className="text-sm font-medium text-gray-700 text-right">{param.label}</label>
        {{
          'Text/Number': () => (
            <TextField
              variant="outlined"
              size="small"
              sx={{ maxWidth: '240px' }}
              value={paramValues[param.name] || ''}
              onChange={(e) => setParamValues({ ...paramValues, [param.name]: e.target.value })}
            />
          ),
          'Selection list': () => (
            <Select
              value={paramValues[param.name] || ''}
              variant="outlined"
              size="small"
              onChange={(e) => setParamValues({ ...paramValues, [param.name]: e.target.value })}
            />
          ),
          Date: () => (
            <LocalizationProvider dateAdapter={AdapterLuxon}>
              <DatePicker
                sx={{ maxWidth: '240px' }}
                value={paramValues[param.name] || null}
                onChange={(date) => setParamValues({ ...paramValues, [param.name]: date })}
              />
            </LocalizationProvider>
          ),
          Snapshot: () => (
            <Select
              defaultValue={''}
              variant="outlined"
              size="small"
              value={paramValues[param.name] || ''}
              onChange={(e) => {
                setParamValues({ ...paramValues, [param.name]: e.target.value });
              }}
            >
              {snapshotCache.map((snapshot) => (
                <MenuItem key={`${param.name}-${snapshot.id}`} value={snapshot.id}>
                  {snapshot.label}
                </MenuItem>
              ))}
            </Select>
          ),
        }[param.type]?.()}
      </div>
    ));

  /**
   * Resets the Run Label to the default value and focuses the input field.
   */
  const resetAndFocusRunLabel = () => {
    if (!ruleSet) return;

    const formattedDate = formatDateIso(new Date());
    const defaultLabel = `${ruleSet.name} - ${formattedDate}`;

    setRunLabel(defaultLabel);
    if (labelInputRef.current) {
      labelInputRef.current.focus();
      // NOTE: A hack to set an uncontrolled input's value before rerender to
      // make select() work.
      labelInputRef.current.value = defaultLabel;
      labelInputRef.current.select();
    }
  };

  /**
   * Resets the Run Info section values to their default values when the rule
   * set changes.
   */
  useEffect(() => {
    resetAndFocusRunLabel();
  }, [ruleSet]);

  /**
   * Handles the "Reset" button click. Resets the Run Info section values to
   * their default values, and clears the parameter values.
   */
  const onResetBtnClick = () => {
    resetAndFocusRunLabel();
    setRunNotes('');

    setParamValues(
      ruleSet.params.reduce((acc, param) => {
        acc[param.name] = '';
        return acc;
      }, {})
    );
  };

  /**
   * Handles the "Run Rule Set" button click. Calls the rule set run endpoint,
   * then displays the returned status.
   */
  const onRunBtnClick = useCallback(async () => {
    try {
      // If the run label contains a date/time, replace it with the current date/time
      const now = new Date();
      const formattedDate = formatDateIso(now);
      const updatedRunLabel = runLabel.replace(rxDateFormatIso, formattedDate);
      setRunLabel(updatedRunLabel);

      const response = await fetch('/api/infra/rule-set/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ruleSetId: ruleSet.id,
          runLabel: updatedRunLabel,
          runNotes,
          rsParams: paramValues,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showSuccess(data.message);
      } else {
        showError(data.message);
      }

      fetchRuns();
    } catch (error) {
      showError(`Error running rule set: ${error.message}`);
      fetchRuns();
    }
  }, [ruleSet, runLabel, runNotes, paramValues, showSuccess, showError]);

  /**
   * MAIN RENDER
   */
  return (
    <div className="flex flex-col h-full">
      <title>Run - Diff2Rule</title>
      <h1 className="text-2xl font-bold">Run</h1>
      <h2 className="text-md mb-6">Execute a rule set</h2>

      <div className="split flex h-full">
        {/* LEFT COLUMN */}
        <div className="split-pane-left flex flex-col">
          <Paper variant="outlined" className="p-4">
            <FormControl fullWidth size="small">
              <InputLabel id="rule-set-label">Rule Set</InputLabel>
              <Select
                labelId="rule-set-label"
                id="rule-set-select"
                defaultValue={''}
                value={ruleSetId || ''}
                label="Rule Set"
                onChange={(event) => setRuleSetId(event.target.value)}
              >
                {rsCache?.map((ruleSet) => (
                  <MenuItem key={ruleSet.id} value={ruleSet.id}>
                    {ruleSet.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Paper>

          {ruleSet && (
            <>
              <Paper variant="outlined" className="p-4 mt-2 mb-2">
                <Typography variant="subtitle1" gutterBottom>
                  Run Info
                </Typography>
                <div className="grid grid-cols-[1fr_2fr] gap-4 items-center">
                  <label className="text-sm font-medium text-gray-700 text-right">Label</label>
                  <TextField
                    inputRef={labelInputRef}
                    id="run-label-input"
                    variant="outlined"
                    size="small"
                    value={runLabel}
                    onChange={(e) => setRunLabel(e.target.value)}
                  />
                  <label className="text-sm font-medium text-gray-700 text-right">Notes</label>
                  <TextField
                    variant="outlined"
                    size="small"
                    multiline
                    rows={6}
                    value={runNotes}
                    onChange={(e) => setRunNotes(e.target.value)}
                  />
                </div>
              </Paper>
              {paramsForm.length > 0 && (
                <Paper variant="outlined" className="p-4">
                  <Typography variant="subtitle1" gutterBottom>
                    Rule Set Parameters
                  </Typography>
                  <div className="flex flex-col space-y-4">{paramsForm}</div>
                </Paper>
              )}
            </>
          )}
          <Paper variant="outlined" className="p-4 mt-2 flex justify-center space-x-2">
            <Button variant="contained" color="primary" onClick={onRunBtnClick} disabled={!ruleSet}>
              Run Rule Set
            </Button>
            <Button variant="contained" color="neutral" onClick={onResetBtnClick} disabled={!ruleSet}>
              Reset
            </Button>
          </Paper>
        </div>

        {/* RIGHT COLUMN */}
        <Paper variant="outlined" className="split-pane-right flex flex-col p-4" style={{ minHeight: '400px' }}>
          <div className="flex-grow flex flex-col">
            <Stack direction="row" spacing={1} justifyContent="flex-end" marginBottom={1}>
              <IconButton title="Refresh" color="primary" onClick={onRefreshBtnClick} size="small">
                <RefreshIcon />
              </IconButton>
            </Stack>
            <div className="flex-grow">
              <AgGridReact rowData={rowData} columnDefs={columnDefs} defaultColDef={{ flex: 1 }} />
            </div>
          </div>
        </Paper>
      </div>
    </div>
  );
};

export default RunPage;
