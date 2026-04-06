import { useState, useEffect } from 'react';
import Highcharts from 'highcharts';
import { HighchartsReact } from 'highcharts-react-official';
import { analytics } from '../services/api';
import './Dashboard.css';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [anomalies, setAnomalies] = useState(null);
  const [month, setMonth] = useState('');

  useEffect(() => {
    const params = month ? { month } : {};
    analytics.summary(params).then(r => setSummary(r.data)).catch(() => {});
    analytics.trends(params).then(r => setTrends(r.data)).catch(() => {});
    analytics.anomalies().then(r => setAnomalies(r.data)).catch(() => {});
  }, [month]);

  if (!summary) return <div className="dash-empty">Upload a CSV file to see your energy dashboard.</div>;

  const kpis = [
    { label: 'Total Energy', value: `${summary.total_energy?.toLocaleString()} kWh`, icon: '⚡', color: '#0ea5e9' },
    { label: 'Solar Used', value: `${summary.total_solar?.toLocaleString()} kWh`, icon: '☀️', color: '#22c55e' },
    { label: 'Grid Energy', value: `${summary.total_grid?.toLocaleString()} kWh`, icon: '🔌', color: '#3b82f6' },
    { label: 'CO₂ Emissions', value: `${summary.co2_total_kg?.toLocaleString()} kg`, icon: '🌍', color: '#f59e0b' },
    { label: 'Renewable %', value: `${summary.renewable_percentage}%`, icon: '🌿', color: '#10b981' },
    { label: 'Occupancy Eff.', value: summary.occupancy_efficiency?.toLocaleString(), icon: '🏢', color: '#8b5cf6' },
  ];

  // Donut chart - Energy breakdown by source
  const donutOptions = {
    chart: { type: 'pie', backgroundColor: 'transparent', height: 320 },
    title: { text: 'Energy Breakdown by Source', style: { fontSize: '15px', fontWeight: '600', color: '#0f172a' } },
    plotOptions: {
      pie: {
        innerSize: '55%',
        borderWidth: 2,
        borderColor: '#fff',
        dataLabels: { format: '{point.name}: {point.percentage:.1f}%', style: { fontSize: '11px' } },
      },
    },
    colors: ['#0ea5e9', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'],
    series: [{
      name: 'kWh',
      data: [
        { name: 'HVAC', y: summary.total_hvac || 0 },
        { name: 'Rooms', y: summary.total_rooms || 0 },
        { name: 'Kitchen', y: summary.total_kitchen || 0 },
        { name: 'Laundry', y: summary.total_laundry || 0 },
        { name: 'Conference', y: summary.total_conference || 0 },
        { name: 'Heatpump', y: summary.total_heatpump || 0 },
      ],
    }],
    credits: { enabled: false },
  };

  // Stacked area - Energy trends over time
  const timestamps = trends.map(t => new Date(t.timestamp).toLocaleString());
  const areaOptions = {
    chart: { type: 'area', backgroundColor: 'transparent', height: 350 },
    title: { text: 'Energy Consumption Over Time', style: { fontSize: '15px', fontWeight: '600', color: '#0f172a' } },
    xAxis: { categories: timestamps, labels: { step: Math.ceil(timestamps.length / 10), style: { fontSize: '10px' } } },
    yAxis: { title: { text: 'kWh' } },
    plotOptions: { area: { stacking: 'normal', lineWidth: 1, marker: { enabled: false } } },
    colors: ['#0ea5e9', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'],
    series: [
      { name: 'HVAC', data: trends.map(t => t.hvac_energy_kWh) },
      { name: 'Rooms', data: trends.map(t => t.rooms_energy_kWh) },
      { name: 'Kitchen', data: trends.map(t => t.kitchen_energy_kWh) },
      { name: 'Laundry', data: trends.map(t => t.laundry_energy_kWh) },
      { name: 'Conference', data: trends.map(t => t.conference_energy_kWh) },
      { name: 'Heatpump', data: trends.map(t => t.heatpump_energy_kWh) },
    ],
    credits: { enabled: false },
  };

  // Bar chart - Solar vs Grid vs Generator
  const barOptions = {
    chart: { type: 'column', backgroundColor: 'transparent', height: 320 },
    title: { text: 'Power Source Comparison', style: { fontSize: '15px', fontWeight: '600', color: '#0f172a' } },
    xAxis: { categories: ['Solar', 'Grid', 'Generator'] },
    yAxis: { title: { text: 'kWh' } },
    colors: ['#22c55e', '#3b82f6', '#f59e0b'],
    series: [{
      name: 'kWh',
      colorByPoint: true,
      data: [summary.total_solar || 0, summary.total_grid || 0, summary.total_generator || 0],
    }],
    legend: { enabled: false },
    credits: { enabled: false },
  };

  // Line chart - Occupancy vs Total Energy
  const lineOptions = {
    chart: { type: 'spline', backgroundColor: 'transparent', height: 320 },
    title: { text: 'Occupancy vs Energy Consumption', style: { fontSize: '15px', fontWeight: '600', color: '#0f172a' } },
    xAxis: { categories: timestamps, labels: { step: Math.ceil(timestamps.length / 10), style: { fontSize: '10px' } } },
    yAxis: [
      { title: { text: 'kWh' } },
      { title: { text: 'Occupancy Rate' }, opposite: true, max: 1 },
    ],
    colors: ['#0ea5e9', '#f59e0b'],
    series: [
      { name: 'Total Energy (kWh)', data: trends.map(t => t.total_energy_kWh), yAxis: 0 },
      { name: 'Occupancy Rate', data: trends.map(t => t.occupancy_rate), yAxis: 1 },
    ],
    credits: { enabled: false },
  };

  return (
    <div className="dashboard">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Energy Dashboard</h1>
          <p className="dash-subtitle">{summary.record_count} records loaded</p>
        </div>
        <select className="filter-select" value={month} onChange={e => setMonth(e.target.value)}>
          <option value="">All Months</option>
          {[...Array(12)].map((_, i) => (
            <option key={i + 1} value={i + 1}>Month {i + 1}</option>
          ))}
        </select>
      </div>

      <div className="kpi-grid">
        {kpis.map((k, i) => (
          <div className="kpi-card" key={i}>
            <div className="kpi-icon" style={{ background: `${k.color}18`, color: k.color }}>{k.icon}</div>
            <div className="kpi-val">{k.value}</div>
            <div className="kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="charts-grid">
        <div className="chart-card"><HighchartsReact highcharts={Highcharts} options={donutOptions} /></div>
        <div className="chart-card"><HighchartsReact highcharts={Highcharts} options={barOptions} /></div>
      </div>

      <div className="chart-card full-width"><HighchartsReact highcharts={Highcharts} options={areaOptions} /></div>
      <div className="chart-card full-width"><HighchartsReact highcharts={Highcharts} options={lineOptions} /></div>

      {anomalies && anomalies.spikes.length > 0 && (
        <div className="anomaly-card">
          <h3>⚠️ Energy Spikes Detected</h3>
          <p>Threshold: {anomalies.threshold} kWh (2× average of {anomalies.average} kWh)</p>
          <div className="spike-list">
            {anomalies.spikes.slice(0, 10).map((s, i) => (
              <div className="spike-item" key={i}>
                <span>{new Date(s.timestamp).toLocaleString()}</span>
                <span className="spike-val">{s.total_energy_kWh?.toFixed(1)} kWh</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
