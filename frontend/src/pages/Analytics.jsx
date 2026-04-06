import { useState, useEffect } from 'react';
import Highcharts from 'highcharts';
import { HighchartsReact } from 'highcharts-react-official';
import { analytics } from '../services/api';
import './Analytics.css';

export default function Analytics() {
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

  if (!summary) return <div className="dash-empty">No data available. Upload a CSV first.</div>;

  const timestamps = trends.map(t => {
    const d = new Date(t.timestamp);
    return `${d.getDate()}/${d.getMonth()+1} ${d.getHours()}:00`;
  });

  const step = Math.max(1, Math.ceil(timestamps.length / 20));
  const xAxis = { categories: timestamps, labels: { step, rotation: -45, style: { fontSize: '10px' } }, tickmarkPlacement: 'on' };

  // Stacked area - full width
  const areaOptions = {
    chart: { type: 'area', backgroundColor: 'transparent', height: 420 },
    title: { text: null },
    xAxis,
    yAxis: { title: { text: 'kWh' }, gridLineColor: '#f0f0f0' },
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

  // Occupancy vs Energy - full width
  const lineOptions = {
    chart: { type: 'spline', backgroundColor: 'transparent', height: 420 },
    title: { text: null },
    xAxis,
    yAxis: [
      { title: { text: 'kWh' }, gridLineColor: '#f0f0f0' },
      { title: { text: 'Occupancy' }, opposite: true, max: 1 },
    ],
    colors: ['#0ea5e9', '#f59e0b'],
    series: [
      { name: 'Total Energy', data: trends.map(t => t.total_energy_kWh), yAxis: 0 },
      { name: 'Occupancy', data: trends.map(t => t.occupancy_rate), yAxis: 1 },
    ],
    credits: { enabled: false },
  };

  // Renewable share - full width
  const renewableOptions = {
    chart: { type: 'pie', backgroundColor: 'transparent', height: 380 },
    title: { text: null },
    colors: ['#22c55e', '#e2e8f0'],
    plotOptions: { pie: { innerSize: '55%', dataLabels: { format: '{point.name}: {point.percentage:.1f}%', style: { fontSize: '13px' } } } },
    series: [{ name: 'Energy', data: [
      { name: 'Renewable', y: summary.renewable_percentage || 0 },
      { name: 'Non-Renewable', y: 100 - (summary.renewable_percentage || 0) },
    ]}],
    credits: { enabled: false },
  };

  // CO2 breakdown - full width
  const co2Options = {
    chart: { type: 'bar', backgroundColor: 'transparent', height: 300 },
    title: { text: null },
    xAxis: { categories: ['Grid', 'Diesel/Generator'] },
    yAxis: { title: { text: 'kg CO₂' }, gridLineColor: '#f0f0f0' },
    colors: ['#3b82f6', '#f59e0b'],
    series: [{ name: 'CO₂', colorByPoint: true, data: [summary.co2_grid_kg || 0, summary.co2_diesel_kg || 0] }],
    legend: { enabled: false },
    credits: { enabled: false },
  };

  // Hourly pattern - full width
  const hourlyMap = {};
  trends.forEach(t => { const h = new Date(t.timestamp).getHours(); hourlyMap[h] = (hourlyMap[h] || 0) + (t.total_energy_kWh || 0); });
  const hourlyOptions = {
    chart: { type: 'column', backgroundColor: 'transparent', height: 380 },
    title: { text: null },
    xAxis: { categories: Object.keys(hourlyMap).map(h => `${h}:00`) },
    yAxis: { title: { text: 'kWh' }, gridLineColor: '#f0f0f0' },
    series: [{ name: 'kWh', data: Object.values(hourlyMap), color: '#0ea5e9' }],
    legend: { enabled: false },
    credits: { enabled: false },
  };

  // Solar vs Grid - full width, fixed x-axis
  const solarGridOptions = {
    chart: { type: 'areaspline', backgroundColor: 'transparent', height: 420 },
    title: { text: null },
    xAxis,
    yAxis: { title: { text: 'kWh' }, gridLineColor: '#f0f0f0' },
    colors: ['#22c55e', '#3b82f6'],
    plotOptions: { areaspline: { fillOpacity: 0.12, marker: { enabled: false } } },
    series: [
      { name: 'Solar', data: trends.map(t => t.solar_used_kWh) },
      { name: 'Grid', data: trends.map(t => t.grid_energy_kWh) },
    ],
    credits: { enabled: false },
  };

  return (
    <div className="analytics-page">
      <div className="analytics-filter">
        <select className="filter-select" value={month} onChange={e => setMonth(e.target.value)}>
          <option value="">All Months</option>
          {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>Month {i+1}</option>)}
        </select>
      </div>

      <div className="a-card"><div className="a-card-header"><h3>Energy Consumption Over Time</h3></div><HighchartsReact highcharts={Highcharts} options={areaOptions} /></div>

      <div className="a-card"><div className="a-card-header"><h3>Occupancy vs Energy</h3></div><HighchartsReact highcharts={Highcharts} options={lineOptions} /></div>

      <div className="a-card"><div className="a-card-header"><h3>Solar vs Grid Usage</h3></div><HighchartsReact highcharts={Highcharts} options={solarGridOptions} /></div>

      <div className="a-card"><div className="a-card-header"><h3>Hourly Energy Pattern</h3></div><HighchartsReact highcharts={Highcharts} options={hourlyOptions} /></div>

      <div className="a-card"><div className="a-card-header"><h3>Renewable Energy Share</h3></div><HighchartsReact highcharts={Highcharts} options={renewableOptions} /></div>

      <div className="a-card"><div className="a-card-header"><h3>CO₂ Emissions Breakdown</h3></div><HighchartsReact highcharts={Highcharts} options={co2Options} /></div>

      {anomalies && anomalies.spikes.length > 0 && (
        <div className="a-card anomaly">
          <div className="a-card-header"><h3>⚠️ Energy Spikes Detected</h3></div>
          <p className="anomaly-info">Threshold: {anomalies.threshold} kWh (2× avg of {anomalies.average} kWh)</p>
          <div className="spike-list">
            {anomalies.spikes.slice(0, 8).map((s, i) => (
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
