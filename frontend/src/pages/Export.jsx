import { useState } from 'react';
import { analytics } from '../services/api';
import './Export.css';

export default function Export() {
  const [loading, setLoading] = useState('');

  const download = async (type) => {
    setLoading(type);
    try {
      const res = type === 'csv' ? await analytics.exportCSV() : await analytics.exportPDF();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = type === 'csv' ? 'energy_export.csv' : 'energy_report.pdf';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Export failed. Make sure you have data uploaded.');
    } finally {
      setLoading('');
    }
  };

  return (
    <div className="export-page">
      <h1 className="page-title">Export Data</h1>
      <p className="page-sub">Download your energy data and reports.</p>

      <div className="export-cards">
        <div className="export-card">
          <div className="export-icon">📊</div>
          <h3>Export CSV</h3>
          <p>Download filtered energy data as a spreadsheet-compatible CSV file.</p>
          <button className="btn-export" onClick={() => download('csv')} disabled={loading === 'csv'}>
            {loading === 'csv' ? 'Exporting...' : 'Download CSV'}
          </button>
        </div>

        <div className="export-card">
          <div className="export-icon">📄</div>
          <h3>Export PDF Report</h3>
          <p>Generate a summary report with energy usage, costs, and CO₂ impact.</p>
          <button className="btn-export pdf" onClick={() => download('pdf')} disabled={loading === 'pdf'}>
            {loading === 'pdf' ? 'Generating...' : 'Download PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
