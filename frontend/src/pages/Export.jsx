import { useState } from 'react';
import { analytics } from '../services/api';
import { chartToBase64 } from '../services/chartExport';
import { getChartConfigs } from '../services/chartConfigs';
import './Export.css';

const CHARTS = [
  { id: 'energy_breakdown', label: 'Energy Breakdown by Source', group: 'Dashboard' },
  { id: 'power_source', label: 'Power Source Comparison', group: 'Dashboard' },
  { id: 'energy_trends', label: 'Energy Consumption Over Time', group: 'Dashboard' },
  { id: 'occupancy_vs_energy', label: 'Occupancy vs Energy', group: 'Dashboard' },
  { id: 'renewable_share', label: 'Renewable Energy Share', group: 'Analytics' },
  { id: 'co2_breakdown', label: 'CO₂ Emissions Breakdown', group: 'Analytics' },
  { id: 'hourly_pattern', label: 'Energy by Hour of Day', group: 'Analytics' },
  { id: 'energy_balance', label: 'Energy Balance by System', group: 'Analytics' },
  { id: 'solar_vs_grid', label: 'Solar vs Grid Over Time', group: 'Analytics' },
];

const LOADS = [
  { id: 'hvac', label: 'HVAC' },
  { id: 'rooms', label: 'Rooms' },
  { id: 'kitchen', label: 'Kitchen' },
  { id: 'laundry', label: 'Laundry' },
  { id: 'conference', label: 'Conference' },
  { id: 'heatpump', label: 'Heatpump' },
];

export default function Export() {
  const [loading, setLoading] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedCharts, setSelectedCharts] = useState([]);
  const [selectedLoads, setSelectedLoads] = useState([]);
  const [status, setStatus] = useState('');

  const toggleChart = (id) => setSelectedCharts(p => p.includes(id) ? p.filter(c => c !== id) : [...p, id]);
  const toggleLoad = (id) => setSelectedLoads(p => p.includes(id) ? p.filter(l => l !== id) : [...p, id]);
  const selectAllCharts = () => setSelectedCharts(selectedCharts.length === CHARTS.length ? [] : CHARTS.map(c => c.id));
  const selectAllLoads = () => setSelectedLoads(selectedLoads.length === LOADS.length ? [] : LOADS.map(l => l.id));

  const downloadCSV = async () => {
    setLoading('csv');
    try {
      const res = await analytics.exportCSV();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'energy_export.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch { alert('Export failed.'); }
    finally { setLoading(''); }
  };

  const downloadPDF = async () => {
    if (selectedCharts.length === 0 && selectedLoads.length === 0) {
      alert('Please select at least one chart or load.');
      return;
    }
    setLoading('pdf');
    setStatus('Fetching data...');
    try {
      // Fetch summary and trends data
      const [summaryRes, trendsRes] = await Promise.all([
        analytics.summary(),
        analytics.trends(),
      ]);

      setStatus('Generating chart images...');
      const configs = getChartConfigs(summaryRes.data, trendsRes.data);

      // Generate base64 images for selected charts
      const chartImages = {};
      for (const chartId of selectedCharts) {
        if (configs[chartId]) {
          setStatus(`Rendering ${chartId}...`);
          const base64 = await chartToBase64(configs[chartId]);
          if (base64) chartImages[chartId] = base64;
        }
      }

      setStatus('Generating PDF...');
      const res = await analytics.exportPDF({
        charts: selectedCharts,
        loads: selectedLoads,
        chartImages,
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'smatics_energy_report.pdf';
      a.click();
      window.URL.revokeObjectURL(url);
      setShowModal(false);
    } catch (e) {
      console.error(e);
      alert('Export failed. Make sure you have data uploaded.');
    } finally {
      setLoading('');
      setStatus('');
    }
  };

  return (
    <div className="export-page">
      <h1 className="page-title">Export Data</h1>
      <p className="page-sub">Download your energy data and generate professional reports.</p>

      <div className="export-cards">
        <div className="export-card">
          <div className="export-icon">📊</div>
          <h3>Export CSV</h3>
          <p>Download all energy data as a spreadsheet-compatible CSV file.</p>
          <button className="btn-export" onClick={downloadCSV} disabled={loading === 'csv'}>
            {loading === 'csv' ? 'Exporting...' : 'Download CSV'}
          </button>
        </div>
        <div className="export-card">
          <div className="export-icon">📄</div>
          <h3>Export PDF Report</h3>
          <p>Generate a custom report with charts, loads, and key insights.</p>
          <button className="btn-export pdf" onClick={() => setShowModal(true)}>Configure Report</button>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Configure PDF Report</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="modal-section">
                <div className="section-header">
                  <h4>Select Charts</h4>
                  <button className="btn-select-all" onClick={selectAllCharts}>
                    {selectedCharts.length === CHARTS.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <p className="section-hint">Charts will be rendered as images with descriptions in the report.</p>
                <div className="group-label">Dashboard Charts</div>
                <div className="checkbox-grid">
                  {CHARTS.filter(c => c.group === 'Dashboard').map(c => (
                    <label key={c.id} className={`checkbox-item ${selectedCharts.includes(c.id) ? 'checked' : ''}`}>
                      <input type="checkbox" checked={selectedCharts.includes(c.id)} onChange={() => toggleChart(c.id)} />
                      {c.label}
                    </label>
                  ))}
                </div>
                <div className="group-label">Analytics Charts</div>
                <div className="checkbox-grid">
                  {CHARTS.filter(c => c.group === 'Analytics').map(c => (
                    <label key={c.id} className={`checkbox-item ${selectedCharts.includes(c.id) ? 'checked' : ''}`}>
                      <input type="checkbox" checked={selectedCharts.includes(c.id)} onChange={() => toggleChart(c.id)} />
                      {c.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="modal-section">
                <div className="section-header">
                  <h4>Select Loads</h4>
                  <button className="btn-select-all" onClick={selectAllLoads}>
                    {selectedLoads.length === LOADS.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <p className="section-hint">Selected loads appear as a detailed breakdown table.</p>
                <div className="checkbox-grid">
                  {LOADS.map(l => (
                    <label key={l.id} className={`checkbox-item ${selectedLoads.includes(l.id) ? 'checked' : ''}`}>
                      <input type="checkbox" checked={selectedLoads.includes(l.id)} onChange={() => toggleLoad(l.id)} />
                      {l.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <span className="selection-count">
                {status || `${selectedCharts.length} charts, ${selectedLoads.length} loads selected`}
              </span>
              <button className="btn-generate" onClick={downloadPDF} disabled={loading === 'pdf'}>
                {loading === 'pdf' ? 'Generating...' : 'Generate PDF Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
