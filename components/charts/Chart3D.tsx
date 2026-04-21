'use client';

import { useEffect, useRef, useState } from 'react';
import { Chart3DConfig } from '@/types/analytics';

interface Chart3DProps {
  config: Chart3DConfig;
}

export function Chart3D({ config }: Chart3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;

    (async () => {
      try {
        const Plotly = (await import('plotly.js-dist-min')).default;
        if (cancelled) return;

        const layout: Record<string, unknown> = {
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
          font: { color: '#94a3b8', size: 11 },
          margin: { l: 10, r: 10, b: 10, t: 40 },
          title: { text: config.title, font: { color: '#e2e8f0', size: 14 } },
          scene: {
            xaxis: { title: config.xLabel, color: '#64748b', gridcolor: '#1e293b' },
            yaxis: { title: config.yLabel, color: '#64748b', gridcolor: '#1e293b' },
            zaxis: { title: config.zLabel, color: '#64748b', gridcolor: '#1e293b' },
            bgcolor: 'rgba(15,23,42,0.6)',
          },
          autosize: true,
          height: 420,
        };

        const plotConfig: Record<string, unknown> = {
          responsive: true,
          displayModeBar: true,
          displaylogo: false,
        };

        if (config.type === '3d_scatter') {
          const x = config.data.map(d => (d as Record<string, number>).x);
          const y = config.data.map(d => (d as Record<string, number>).y);
          const z = config.data.map(d => (d as Record<string, number>).z);

          await Plotly.newPlot(containerRef.current!, [{
            type: 'scatter3d',
            mode: 'markers',
            x, y, z,
            marker: {
              size: 3,
              color: z,
              colorscale: 'Viridis',
              opacity: 0.8,
              colorbar: { title: config.zLabel, tickfont: { color: '#94a3b8' } },
            },
          }], layout, plotConfig);
        }

        if (config.type === '3d_surface') {
          const meta = config.data[0] as Record<string, unknown>;
          const grid = meta.grid as number[][];
          const gridSize = meta.gridSize as number;
          const xMin = meta.xMin as number, xMax = meta.xMax as number;
          const yMin = meta.yMin as number, yMax = meta.yMax as number;

          const xArr = Array.from({ length: gridSize }, (_, i) =>
            +(xMin + (i / (gridSize - 1)) * (xMax - xMin)).toFixed(2)
          );
          const yArr = Array.from({ length: gridSize }, (_, i) =>
            +(yMin + (i / (gridSize - 1)) * (yMax - yMin)).toFixed(2)
          );

          await Plotly.newPlot(containerRef.current!, [{
            type: 'surface',
            z: grid,
            x: xArr,
            y: yArr,
            colorscale: 'Portland',
            contours: {
              z: { show: true, usecolormap: true, highlightcolor: '#06b6d4', project: { z: true } },
            },
          }], layout, plotConfig);
        }

        if (config.type === '3d_bar') {
          const categories = config.data.map(d => (d as Record<string, string>).category);
          const keys = Object.keys(config.data[0] || {}).filter(k => k !== 'category');
          const yVals = config.data.map(d => (d as Record<string, number>)[keys[0]] || 0);
          const zVals = config.data.map(d => (d as Record<string, number>)[keys[1]] || 0);

          await Plotly.newPlot(containerRef.current!, [{
            type: 'scatter3d',
            mode: 'markers',
            x: categories,
            y: yVals,
            z: zVals,
            marker: {
              size: 10,
              color: zVals,
              colorscale: 'Cividis',
              opacity: 0.9,
              symbol: 'diamond',
              colorbar: { title: config.zLabel, tickfont: { color: '#94a3b8' } },
            },
            text: categories.map((c, i) =>
              `${c}<br>${keys[0]}: ${yVals[i]}<br>${keys[1]}: ${zVals[i]}`
            ),
            hoverinfo: 'text',
          }], layout, plotConfig);
        }

        setLoaded(true);
      } catch (e) {
        console.error('3D chart error:', e);
        setError(true);
      }
    })();

    return () => {
      cancelled = true;
      if (containerRef.current) {
        try {
          import('plotly.js-dist-min').then(({ default: Plotly }) => {
            if (containerRef.current) Plotly.purge(containerRef.current);
          });
        } catch { /* ignore cleanup errors */ }
      }
    };
  }, [config]);

  if (error) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 h-[460px] flex items-center justify-center text-slate-500 text-sm">
        Failed to load 3D chart
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
      {!loaded && (
        <div className="h-[420px] flex items-center justify-center">
          <div className="text-sm text-slate-500 animate-pulse">Loading 3D visualization...</div>
        </div>
      )}
      <div ref={containerRef} className={loaded ? '' : 'opacity-0 h-0'} />
    </div>
  );
}
