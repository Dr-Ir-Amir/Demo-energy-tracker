import { useState, useEffect } from 'react';
import { data } from '../services/api';
import './Upload.css';

export default function Upload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [uploads, setUploads] = useState([]);

  useEffect(() => {
    data.uploads().then(r => setUploads(r.data)).catch(() => {});
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    setResult(null);
    try {
      const res = await data.upload(file);
      setResult(res.data);
      setFile(null);
      data.uploads().then(r => setUploads(r.data));
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-page">
      <h1 className="page-title">Upload CSV Data</h1>
      <p className="page-sub">Upload your energy monitoring CSV files to populate the dashboard.</p>

      <div className="upload-zone" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); setFile(e.dataTransfer.files[0]); }}>
        <div className="upload-icon">📁</div>
        <p>Drag & drop your CSV file here, or</p>
        <label className="file-label">
          Browse Files
          <input type="file" accept=".csv" onChange={e => setFile(e.target.files[0])} hidden />
        </label>
        {file && <p className="file-name">Selected: {file.name}</p>}
      </div>

      <button className="btn-upload" onClick={handleUpload} disabled={!file || uploading}>
        {uploading ? 'Uploading...' : 'Upload CSV'}
      </button>

      {error && <div className="upload-error">{error}</div>}
      {result && (
        <div className="upload-success">
          ✅ {result.message}
          <div className="cols-detected">Columns: {result.columns_detected?.join(', ')}</div>
        </div>
      )}

      {uploads.length > 0 && (
        <div className="upload-history">
          <h3>Upload History</h3>
          {uploads.map(u => (
            <div className="history-item" key={u.id}>
              <span className="hist-name">{u.file_name}</span>
              <span className="hist-rows">{u.row_count} rows</span>
              <span className="hist-date">{new Date(u.uploaded_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
