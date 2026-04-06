import { useState, useEffect } from 'react';
import Highcharts from 'highcharts';
import { HighchartsReact } from 'highcharts-react-official';
import { analytics } from '../services/api';
import './Analytics.css';

export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);

  useEffect(() => {
    analytics.summary().then(r => setSummary(r.data)).catch(() => {});
    analytics.trends().then(r => setTrends(r.data)).catch(() => {});
  }, []);

  if (!summary) return <div className="dash-empty">No data available. Upload a CSV first.</div>;

  const timestamps = trends.map(t => new Date(t.timestamp).toLocaleString());

  // Semi-donut: Renewable percentage
  const gaugeOptions = {
    chart: { type: 'pie', backgroundColor: 'transparent', height: 280 },
    title: { text: 'Renewable Energy Share', style: { fontSize: '15px', fontWeight: '600' } },
    plotOptions: {
      pie: {
        innerSize: '60%',
        startAngle: -90,
        endAngle: 90,
        center: ['50%', '75%'],
        dataLabels: { enabled: true, format: '{point.name}: {point.percentage:.1f}%', style: { fontSize: '12px' } },
      },
    },
    colors: ['#22c55e', '#e2e8f0'],
    series: [{
      name: 'Energy',
      data: [
        { name: 'Renewable', y: summary.renewable_percentage || 0 },
        { name: 'Non-Renewable', y: 100 - (summary.renewable_percentage || 0) },
      ],
    }],
    credits: { enabled: false },
  };

  // Heatmap-style bar: Hourly energy pattern
  const hourlyMap = {};
  trends.forEach(t => {
    const h = new Date(t.timestamp).getHours();
    hourlyMap[h] = (hourlyMap[h] || 0) + (t.total_energy_kWh || 0);
  });
  const hourlyBarOptions = {
    chart: { type: 'column', backgroundColor: 'transparent', height: 300 },
    title: { text: 'Energy by Hour of Day', style: { fontSize: '15px', fontWeight: '600' } },
    xAxis: { categories: Object.keys(hourlyMap).map(h => `${h}:00`), title: { text: 'Hour' } },
    yAxis: { title: { text: 'Total kWh' } },
    series: [{ name: 'kWh', data: Object.values(hourlyMap), color: '#0ea5e9' }],
    legend: { enabled: false },
    credits: { enabled: false },
  };

  // Stacked bar: Grid vs Solar vs Generator per source
  const co2Options = {
    chart: { type: 'bar', backgroundColor: 'transparent', height: 280 },
    title: { text: 'CO₂ Emissions Breakdown', style: { fontSize: '15px', fontWeight: '600' } },
    xAxis: { categories: ['Grid', 'Diesel/Generator'] },
    yAxis: { title: { text: 'kg CO₂' } },
    colors: ['#3b82f6', '#f59e0b'],
    series: [{ name: 'CO₂ (kg)', colorByPoint: true, data: [summary.co2_grid_kg, summary.co2_diesel_kg] }],
    legend: { enabled: false },
    credits: { enabled: false },
  };

  // Column: Energy balance breakdown
  const balanceOptions = {
    chart: { type: 'column', backgroundColor: 'transparent', height: 320 },
    title: { text: 'Energy Balance by System', style: { fontSize: '15px', fontWeight: '600' } },
    xAxis: { categories: ['HVAC', 'Rooms', 'Kitchen', 'Laundry', 'Conference', 'Heatpump'] },
    yAxis: { title: { text: 'kWh' } },
    series: [{
      name: 'kWh',
      colorByPoint: true,
      data: [
        { y: summary.total_hvac || 0, color: '#0ea5e9' },
        { y: summary.total_rooms || 0, color: '#22c55e' },
        { y: summary.total_kitchen || 0, color: '#f59e0b' },
        { y: summary.total_laundry || 0, color: '#8b5cf6' },
        { y: summary.total_conference || 0, color: '#ec4899' },
        { y: summary.total_heatpump || 0, color: '#06b6d4' },
      ],
      dataLabels: { enabled: true, format: '{y:.0f}', style: { fontSize: '11px' } },
    }],
    legend: { enabled: false },
    credits: { enabled: false },
  };

  // Solar vs Grid line comparison
  const solarGridOptions = {
    chart: { type: 'areaspline', backgroundColor: 'transparent', height: 320 },
    title: { text: 'Solar vs Grid Usage Over Time', style: { fontSize: '15px', fontWeight: '600' } },
    xAxis: { categories: timestamps, labels: { step: Math.ceil(timestamps.length / 8), style: { fontSize: '10px' } } },
    yAxis: { title: { text: 'kWh' } },
    colors: ['#22c55e', '#3b82f6'],
    plotOptions: { areaspline: { fillOpacity: 0.15, marker: { enabled: false } } },
    series: [
      { name: 'Solar', data: trends.map(t => t.solar_used_kWh) },
      { name: 'Grid', data: trends.map(t => t.grid_energy_kWh) },
    ],
    credits: { enabled: false },
  };

  return (
    <div className="analytics-page">
      <h1 className="page-title">Analytics & Insights</h1>
      <p className="page-sub">Deep dive into your energy patterns and sustainability metrics.</p>

      <div className="analytics-grid">
        <div className="chart-card"><HighchartsReact highcharts={Highcharts} options={gaugeOptions} /></div>
        <div className="chart-card"><HighchartsReact highcharts={Highcharts} options={co2Options} /></div>
      </div>

      <div className="chart-card full-width"><HighchartsReact highcharts={Highcharts} options={hourlyBarOptions} /></div>
      <div className="chart-card full-width"><HighchartsReact highcharts={Highcharts} options={balanceOptions} /></div>
      <div className="chart-card full-width"><HighchartsReact highcharts={Highcharts} options={solarGridOptions} /></div>
    </div>
  );
}
