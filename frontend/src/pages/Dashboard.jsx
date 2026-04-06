import { useState, useEffect } from 'react';
import Highcharts from 'highcharts';
import { HighchartsReact } from 'highcharts-react-official';
import { analytics } from '../services/api';
import './Dashboard.css';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [month, setMonth] = useState('');

  useEffect(() => {
    const params = month ? { month } : {};
    analytics.summary(params).then(r => setSummary(r.data)).catch(() => {});
  }, [month]);

  if (!summary || summary.record_count === 0)
    return <div className="dash-empty">Upload a CSV file to see your energy dashboard.</div>;

  const kpis = [
    { label: 'Total Energy', value: summary.total_energy, unit: 'kWh', icon: '⚡', color: '#0ea5e9' },
    { label: 'Solar Used', value: summary.total_solar, unit: 'kWh', icon: '☀️', color: '#22c55e' },
    { label: 'Grid Energy', value: summary.total_grid, unit: 'kWh', icon: '🔌', color: '#3b82f6' },
    { label: 'CO₂ Emissions', value: summary.co2_total_kg, unit: 'kg', icon: '🌍', color: '#f59e0b' },
  ];

  const pieOptions = {
    chart: { type: 'pie', backgroundColor: 'transparent', height: 300 },
    title: { text: null },
    plotOptions: { pie: { borderWidth: 2, borderColor: '#fff', dataLabels: { format: '{point.name}: {point.percentage:.1f}%', style: { fontSize: '11px' } } } },
    colors: ['#0ea5e9', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'],
    series: [{ name: 'kWh', data: [
      { name: 'HVAC', y: summary.total_hvac || 0 },
      { name: 'Rooms', y: summary.total_rooms || 0 },
      { name: 'Kitchen', y: summary.total_kitchen || 0 },
      { name: 'Laundry', y: summary.total_laundry || 0 },
      { name: 'Conference', y: summary.total_conference || 0 },
      { name: 'Heatpump', y: summary.total_heatpump || 0 },
    ]}],
    credits: { enabled: false },
  };

  const barOptions = {
    chart: { type: 'column', backgroundColor: 'transparent', height: 300 },
    title: { text: null },
    xAxis: { categories: ['Solar', 'Grid', 'Generator'], labels: { style: { fontSize: '12px' } } },
    yAxis: { title: { text: 'kWh' }, gridLineColor: '#f0f0f0' },
    colors: ['#22c55e', '#3b82f6', '#f59e0b'],
    series: [{ name: 'kWh', colorByPoint: true, data: [summary.total_solar || 0, summary.total_grid || 0, summary.total_generator || 0] }],
    legend: { enabled: false },
    credits: { enabled: false },
  };

  // Quick stats for the detail cards
  const details = [
    { label: 'Renewable', metric: `${summary.renewable_percentage}%`, change: summary.renewable_percentage > 15 ? '↑ Good' : '↓ Low' },
    { label: 'Occupancy Eff.', metric: summary.occupancy_efficiency?.toLocaleString() || '—', change: '' },
    { label: 'Diesel Used', metric: `${summary.total_diesel || 0} L`, change: '' },
  ];

  return (
    <div className="dashboard">
      {/* Filter */}
      <div className="dash-filter-row">
        <select className="filter-select" value={month} onChange={e => setMonth(e.target.value)}>
          <option value="">All Months</option>
          {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>Month {i+1}</option>)}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {kpis.map((k, i) => (
          <div className="kpi-card" key={i}>
            <div className="kpi-top">
              <div className="kpi-icon" style={{ background: `${k.color}12`, color: k.color }}>{k.icon}</div>
              <span className="kpi-dots">⋯</span>
            </div>
            <div className="kpi-value">{typeof k.value === 'number' ? k.value.toLocaleString(undefined, {maximumFractionDigits: 1}) : k.value}</div>
            <div className="kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="charts-row">
        <div className="chart-card wide">
          <div className="chart-header">
            <h3>Energy Breakdown</h3>
          </div>
          <HighchartsReact highcharts={Highcharts} options={pieOptions} />
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h3>Power Source</h3>
          </div>
          <HighchartsReact highcharts={Highcharts} options={barOptions} />
          <div className="detail-table">
            {details.map((d, i) => (
              <div className="detail-row" key={i}>
                <span className="detail-label">{d.label}</span>
                <span className="detail-metric">{d.metric}</span>
                <span className={`detail-change ${d.change.startsWith('↑') ? 'up' : 'down'}`}>{d.change}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Records count */}
      <div className="records-bar">
        <span>{summary.record_count} records loaded</span>
      </div>
    </div>
  );
}
