import Highcharts from 'highcharts';
import HighchartsExporting from 'highcharts/modules/exporting';
import HighchartsOfflineExporting from 'highcharts/modules/offline-exporting';

// Initialize exporting modules
try { HighchartsExporting(Highcharts); } catch(e) {}
try { HighchartsOfflineExporting(Highcharts); } catch(e) {}

export function chartToBase64(options) {
  return new Promise((resolve) => {
    // Create a temporary hidden container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '600px';
    container.style.height = '400px';
    document.body.appendChild(container);

    const chart = Highcharts.chart(container, {
      ...options,
      chart: { ...options.chart, animation: false, width: 600, height: 350 },
      exporting: { enabled: false },
    });

    // Use SVG to canvas to base64
    const svg = chart.getSVG();
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 350;
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 600, 350);
      ctx.drawImage(img, 0, 0);
      const base64 = canvas.toDataURL('image/png').split(',')[1];
      chart.destroy();
      document.body.removeChild(container);
      resolve(base64);
    };

    img.onerror = () => {
      chart.destroy();
      document.body.removeChild(container);
      resolve(null);
    };

    const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    img.src = URL.createObjectURL(svgBlob);
  });
}
