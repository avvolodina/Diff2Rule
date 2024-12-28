'use client';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid2 as Grid,
  Stack,
  Paper,
  IconButton,
  Popover,
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { AdapterLuxon } from '@mui/x-date-pickers/AdapterLuxon';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { DateTime } from 'luxon';
import { useSnackbar } from '@components/SnackbarContext';

const PERIOD_OPTIONS = ['Month', 'Quarter', 'Year'];
const REFERENCE_OPTIONS = ['Beginning Of', 'End Of'];

/**
 * Dialog component for creating temporal batches of snapshots.
 * @param {Object} props - Component props.
 * @param {boolean} props.open - Whether the dialog is open.
 * @param {function} props.onClose - Callback function to close the dialog.
 * @param {function} props.onCreate - Callback function to handle the creation of a temporal batch.
 * @param {Object} props.tqMap - Map of target query IDs to names.
 */
export default function CreateTemporalBatchDialog({ open, onClose, onCreate, tqMap }) {
  const { showError } = useSnackbar();
  const [selectedTqId, setSelectedTqId] = useState('');
  const [labelTemplate, setLabelTemplate] = useState('{tq} - {date}');
  const [notesTemplate, setNotesTemplate] = useState('Batched for {tq} at {date}');
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [period, setPeriod] = useState(PERIOD_OPTIONS[0]);
  const [reference, setReference] = useState(REFERENCE_OPTIONS[0]);
  const [selectedDates, setSelectedDates] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);

  /**
   * Handles the "Add Dates" button click.
   * Generates a list of dates based on the selected period and reference, and adds them to the selected dates.
   */
  const onAddDatesClick = useCallback(() => {
    if (!fromDate || !toDate) {
      showError('Please select both From and To Dates.');
      return;
    }

    if (fromDate > toDate) {
      showError('From Date must be before To Date.');
      return;
    }

    let dates = [];
    let current = fromDate;

    while (current <= toDate) {
      let refDate;
      if (reference === 'Beginning Of') {
        refDate = current.startOf(period.toLowerCase());
      } else {
        refDate = current.endOf(period.toLowerCase());
      }

      const formattedDate = refDate.toFormat('yyyy-MM-dd');
      if (!dates.includes(formattedDate)) {
        dates.push(formattedDate);
      }

      current = current.plus({ [period.toLowerCase()]: 1 });
    }

    setSelectedDates((prevDates) => {
      const newDates = [];

      if (!!prevDates.trim().length) {
        newDates.push(...prevDates.trim().split('\n'));
      }

      newDates.push(...dates);

      return newDates.join('\n');
    });
  }, [fromDate, toDate, period, reference, showError]);

  /**
   * Handles the "Sort Dates" button click.
   * Sorts the selected dates in ascending order.
   */
  const onSortDatesBtnClick = useCallback(() => {
    const dates = selectedDates
      .split('\n')
      .map((str) => str.trim())
      .filter(Boolean)
      .map((date) => DateTime.fromFormat(date, 'yyyy-MM-dd'));

    if (dates.some((date) => !date.isValid)) {
      showError('Some dates are invalid. Please use YYYY-MM-DD format.');
      return;
    }

    const sortedDates = dates
      .sort((a, b) => a - b)
      .map((date) => date.toFormat('yyyy-MM-dd'))
      .join('\n');
    
    setSelectedDates(sortedDates);
  }, [selectedDates, showError]);

  /**
   * Handles the "Create" button click.
   * Validates the form data and creates a temporal batch of snapshots.
   */
  const onCreateBtnClick = useCallback(() => {
    const dates = selectedDates
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (!selectedTqId) {
      showError('Please select a Target Query.');
      return;
    }

    if (!labelTemplate) {
      showError('Please enter a Label Template.');
      return;
    }

    if (dates.length === 0) {
      showError('Please add at least one date.');
      return;
    }

    for (const date of dates) {
      if (!DateTime.fromFormat(date, 'yyyy-MM-dd').isValid) {
        showError(`Invalid date format: ${date}. Please use YYYY-MM-DD format.`);
        return;
      }
    }

    const uniqueDates = [...new Set(dates)];
    if (uniqueDates.length !== dates.length) {
      showError('Duplicate dates found. Please remove duplicates.');
      return;
    }

    const tqName = tqMap[selectedTqId];

    onClose();
    onCreate({
      tqId: selectedTqId,
      tqName: tqName,
      labelTemplate,
      notesTemplate,
      dates: uniqueDates,
    });
  }, [selectedTqId, labelTemplate, notesTemplate, selectedDates, onCreate, onClose, showError, tqMap]);

  /**
   * Populates the Target Query dropdown menu.
   */
  const tqMenuItems = useMemo(() => {
    if(!tqMap) return [];
    
    return Object.entries(tqMap).map(([id, name]) => (
      <MenuItem key={id} value={id}>
        {name}
      </MenuItem>
    ));
  }, [tqMap]);

  /**
   * Resets the form fields when the dialog is opening.
   */
  useEffect(() => {
    if(!open) return;

    setSelectedTqId('');
    setLabelTemplate('{tq} - {date}');
    setNotesTemplate('Batched for {tq} at {date}');
  }, [open]);

  /**
   * MAIN RENDER
   */
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle className="pb-0">Create Temporal Batch</DialogTitle>
      <DialogContent className="p-4 pb-1">
        <Stack spacing={2} className="pt-0 mt-2">
          <FormControl fullWidth>
            <InputLabel id="target-query-label">Target Query</InputLabel>
            <Select
              labelId="target-query-label"
              id="target-query-select"
              value={selectedTqId}
              label="Target Query"
              onChange={(event) => setSelectedTqId(event.target.value)}
            >
              {tqMenuItems}
            </Select>
          </FormControl>
          <Grid container alignItems="center" spacing={1}>
            <Grid size={11}>
              <TextField
                label="Label Template"
                value={labelTemplate}
                onChange={(event) => setLabelTemplate(event.target.value)}
                size="small"
                fullWidth
              />
            </Grid>
            <Grid size={1}>
              <IconButton onClick={(event) => setAnchorEl(event.currentTarget)} title="Template help">
                <HelpOutlineIcon color="primary" />
              </IconButton>
            </Grid>
          </Grid>
          <Popover
            open={Boolean(anchorEl)}
            anchorEl={anchorEl}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
          >
            <div className="p-4">
              You can use the following macros in the template fields:
              <ul className="list-disc ml-4">
                <li>
                  <code>&#123;tq&#125;</code> - Target Query name
                </li>
                <li>
                  <code>&#123;date&#125;</code> - Date
                </li>
              </ul>
            </div>
          </Popover>
          <TextField
            label="Notes Template"
            value={notesTemplate}
            onChange={(event) => setNotesTemplate(event.target.value)}
            multiline
            rows={3}
            size="small"
            fullWidth
          />

          <LocalizationProvider dateAdapter={AdapterLuxon}>
            <Paper elevation={1} className="p-4">
              <Grid container spacing={2} alignItems="center">
                <Grid size={12}>
                  <h3 className="text-sm font-bold -my-1 text-gray-600">Add Dates</h3>
                </Grid>
                <Grid size={6}>
                  <DatePicker
                    label="From Date"
                    value={fromDate}
                    onChange={(date) => setFromDate(date)}
                    format="yyyy-MM-dd"
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid size={6}>
                  <DatePicker
                    label="To Date"
                    value={toDate}
                    onChange={(date) => setToDate(date)}
                    format="yyyy-MM-dd"
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid size={4}>
                  <FormControl fullWidth>
                    <InputLabel id="period-label">Period</InputLabel>
                    <Select
                      labelId="period-label"
                      id="period-select"
                      value={period}
                      label="Period"
                      onChange={(event) => setPeriod(event.target.value)}
                      size="small"
                    >
                      {PERIOD_OPTIONS.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={6}>
                  <FormControl fullWidth>
                    <InputLabel id="reference-label">Reference</InputLabel>
                    <Select
                      labelId="reference-label"
                      id="reference-select"
                      value={reference}
                      label="Reference"
                      onChange={(event) => setReference(event.target.value)}
                      size="small"
                    >
                      {REFERENCE_OPTIONS.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={2}>
                  <Button variant="outlined" color="primary" onClick={onAddDatesClick} title="Add date batch" fullWidth>
                    Add
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </LocalizationProvider>
          <Paper elevation={1} className="bg-white p-4">
            <TextField
              label="Selected Dates (YYYY-MM-DD)"
              placeholder="YYYY-MM-DD"
              value={selectedDates}
              onChange={(event) => setSelectedDates(event.target.value)}
              multiline
              rows={5}
              size="small"
              fullWidth
              InputProps={{ style: { fontFamily: 'monospace' } }}
            />
            <Stack direction="row" justifyContent="flex-end" mt={1}>
              <Button variant="outlined" size="small" onClick={onSortDatesBtnClick} title="Sort dates" className="mr-1">
                Sort
              </Button>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => setSelectedDates('')}
                title="Clear dates"
              >
                Clear
              </Button>
            </Stack>
          </Paper>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="primary" onClick={onCreateBtnClick}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
