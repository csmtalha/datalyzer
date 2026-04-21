declare module 'plotly.js-dist-min' {
  const Plotly: {
    newPlot: (
      root: HTMLElement,
      data: Record<string, unknown>[],
      layout?: Record<string, unknown>,
      config?: Record<string, unknown>
    ) => Promise<void>;
    purge: (root: HTMLElement) => void;
  };
  export default Plotly;
}
