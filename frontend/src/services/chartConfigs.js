export function getChartConfigs(summary, trends) {
  const timestamps = trends.map(t => {
    const d = new Date(t.timestamp);
    return `${d.getDate()}/${d.getMonth()+1} ${d.getHours()}:00`;
  });

  const configs = {};

  configs.energy_breakdown = {
    chart: { type: 'pie', backgroundColor: '#fff' },
    title: { text: 'Energy Breakdown by Source' },
    plotOptions: { pie: { dataLabels: { format: '{point.name}: {point.percentage:.1f}%' } } },
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

  configs.power_source = {
    chart: { type: 'column', backgroundColor: '#fff' },
    title: { text: 'Power Source Comparison' },
    xAxis: { categories: ['Solar', 'Grid', 'Generator'] },
    yAxis: { title: { text: 'kWh' } },
    colors: ['#22c55e', '#3b82f6', '#f59e0b'],
    series: [{ name: 'kWh', colorByPoint: true, data: [summary.total_solar || 0, summary.total_grid || 0, summary.total_generator || 0] }],
    legend: { enabled: false },
    credits: { enabled: false },
  };

  configs.energy_trends = {
    chart: { type: 'area', backgroundColor: '#fff' },
    title: { text: 'Energy Consumption Over Time' },
    xAxis: { categories: timestamps, labels: { step: Math.ceil(timestamps.length / 10), rotation: -45, style: { fontSize: '9px' } } },
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

  configs.occupancy_vs_energy = {
    chart: { type: 'spline', backgroundColor: '#fff' },
    title: { text: 'Occupancy vs Energy Consumption' },
    xAxis: { categories: timestamps, labels: { step: Math.ceil(timestamps.length / 10), rotation: -45, style: { fontSize: '9px' } } },
    yAxis: [{ title: { text: 'kWh' } }, { title: { text: 'Occupancy' }, opposite: true, max: 1 }],
    colors: ['#0ea5e9', '#f59e0b'],
    series: [
      { name: 'Total Energy', data: trends.map(t => t.total_energy_kWh), yAxis: 0 },
      { name: 'Occupancy', data: trends.map(t => t.occupancy_rate), yAxis: 1 },
    ],
    credits: { enabled: false },
  };

  configs.renewable_share = {
    chart: { type: 'pie', backgroundColor: '#fff' },
    title: { text: 'Renewable Energy Share' },
    colors: ['#22c55e', '#e2e8f0'],
    plotOptions: { pie: { innerSize: '60%', startAngle: -90, endAngle: 90, center: ['50%', '75%'], dataLabels: { format: '{point.name}: {point.percentage:.1f}%' } } },
    series: [{ name: 'Energy', data: [
      { name: 'Renewable', y: summary.renewable_percentage || 0 },
      { name: 'Non-Renewable', y: 100 - (summary.renewable_percentage || 0) },
    ]}],
    credits: { enabled: false },
  };

  configs.co2_breakdown = {
    chart: { type: 'bar', backgroundColor: '#fff' },
    title: { text: 'CO₂ Emissions Breakdown' },
    xAxis: { categories: ['Grid', 'Diesel/Generator'] },
    yAxis: { title: { text: 'kg CO₂' } },
    colors: ['#3b82f6', '#f59e0b'],
    series: [{ name: 'CO₂ (kg)', colorByPoint: true, data: [summary.co2_grid_kg || 0, summary.co2_diesel_kg || 0] }],
    legend: { enabled: false },
    credits: { enabled: false },
  };

  const hourlyMap = {};
  trends.forEach(t => {
    const h = new Date(t.timestamp).getHours();
    hourlyMap[h] = (hourlyMap[h] || 0) + (t.total_energy_kWh || 0);
  });
  configs.hourly_pattern = {
    chart: { type: 'column', backgroundColor: '#fff' },
    title: { text: 'Energy by Hour of Day' },
    xAxis: { categories: Object.keys(hourlyMap).map(h => `${h}:00`) },
    yAxis: { title: { text: 'Total kWh' } },
    series: [{ name: 'kWh', data: Object.values(hourlyMap), color: '#0ea5e9' }],
    legend: { enabled: false },
    credits: { enabled: false },
  };

  configs.energy_balance = {
    chart: { type: 'column', backgroundColor: '#fff' },
    title: { text: 'Energy Balance by System' },
    xAxis: { categories: ['HVAC', 'Rooms', 'Kitchen', 'Laundry', 'Conference', 'Heatpump'] },
    yAxis: { title: { text: 'kWh' } },
    series: [{ name: 'kWh', colorByPoint: true, data: [
      { y: summary.total_hvac || 0, color: '#0ea5e9' },
      { y: summary.total_rooms || 0, color: '#22c55e' },
      { y: summary.total_kitchen || 0, color: '#f59e0b' },
      { y: summary.total_laundry || 0, color: '#8b5cf6' },
      { y: summary.total_conference || 0, color: '#ec4899' },
      { y: summary.total_heatpump || 0, color: '#06b6d4' },
    ]}],
    legend: { enabled: false },
    credits: { enabled: false },
  };

  configs.solar_vs_grid = {
    chart: { type: 'areaspline', backgroundColor: '#fff' },
    title: { text: 'Solar vs Grid Usage Over Time' },
    xAxis: { categories: timestamps, labels: { step: Math.ceil(timestamps.length / 10), rotation: -45, style: { fontSize: '9px' } } },
    yAxis: { title: { text: 'kWh' } },
    colors: ['#22c55e', '#3b82f6'],
    plotOptions: { areaspline: { fillOpacity: 0.15, marker: { enabled: false } } },
    series: [
      { name: 'Solar', data: trends.map(t => t.solar_used_kWh) },
      { name: 'Grid', data: trends.map(t => t.grid_energy_kWh) },
    ],
    credits: { enabled: false },
  };

  return configs;
}
