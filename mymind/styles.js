export const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  @keyframes appear {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes popIn {
    from {
      opacity: 0;
      transform: scale(.96);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .card-rich h2 {
    font-size: 14.5px;
    font-weight: 600;
    color: #111;
    margin: 0 0 7px;
    letter-spacing: -0.02em;
    line-height: 1.3;
  }

  .card-rich h3 {
    font-size: 12.5px;
    font-weight: 600;
    color: #444;
    margin: 9px 0 4px;
  }

  .card-rich p {
    font-size: 13px;
    line-height: 1.65;
    color: #444;
    margin: 0 0 6px;
    letter-spacing: -0.005em;
  }

  .card-rich p:last-child {
    margin-bottom: 0;
  }

  .card-rich ul,
  .card-rich ol {
    padding-left: 16px;
    margin: 4px 0 6px;
  }

  .card-rich li {
    font-size: 12.5px;
    line-height: 1.6;
    color: #555;
    margin-bottom: 2px;
  }

  .card-rich strong {
    font-weight: 600;
    color: #222;
  }

  .card-rich code {
    background: #f4f4f2;
    padding: 1px 5px;
    border-radius: 4px;
    font-size: .85em;
    font-family: monospace;
    color: #666;
  }

  .card-rich pre {
    background: #f4f4f2;
    border-radius: 6px;
    padding: 8px 10px;
    font-size: 11.5px;
    margin: 6px 0;
    overflow-x: auto;
    line-height: 1.5;
  }

  .detail-editor-wrap .ql-container.ql-bubble {
    border: none;
    font-family: Georgia, 'Times New Roman', serif;
  }

  .ql-bubble .ql-tooltip {
    z-index: 9999 !important;
  }

  .detail-editor-wrap .ql-editor {
    font-size: 16px;
    line-height: 1.85;
    color: #333;
    padding: 0;
    min-height: 200px;
  }

  .detail-editor-wrap .ql-editor.ql-blank::before {
    color: #ccc;
    font-style: normal;
    left: 0;
  }

  .detail-editor-wrap .ql-editor h2 {
    font-size: 28px;
    font-weight: 600;
    color: #111;
    margin: 0 0 20px;
    text-align: center;
  }

  .detail-editor-wrap .ql-editor h3 {
    font-size: 16px;
    font-weight: 600;
    margin: 20px 0 8px;
    font-family: 'DM Sans', sans-serif;
  }

  .detail-editor-wrap .ql-editor p {
    margin: 0 0 14px;
  }

  .detail-editor-wrap .ql-editor ul,
  .detail-editor-wrap .ql-editor ol {
    padding-left: 22px;
    margin: 8px 0 14px;
  }

  .detail-editor-wrap .ql-editor li {
    margin-bottom: 5px;
  }

  .detail-editor-wrap .ql-editor code {
    background: #f4f4f2;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: .88em;
    font-family: monospace;
  }

  .detail-content {
    font-family: Georgia, 'Times New Roman', serif;
  }

  .detail-content h2 {
    font-size: 32px;
    font-weight: 600;
    color: #111;
    margin: 0 0 28px;
    text-align: center;
    letter-spacing: -0.02em;
    line-height: 1.2;
  }

  .detail-content h3 {
    font-size: 17px;
    font-weight: 600;
    color: #222;
    margin: 28px 0 10px;
    font-family: 'DM Sans', sans-serif;
  }

  .detail-content p {
    font-size: 16px;
    line-height: 1.85;
    color: #333;
    margin: 0 0 18px;
  }

  .detail-content p:last-child {
    margin: 0;
  }

  .detail-content ul,
  .detail-content ol {
    padding-left: 24px;
    margin: 10px 0 18px;
  }

  .detail-content li {
    font-size: 15px;
    line-height: 1.8;
    color: #444;
    margin-bottom: 7px;
  }

  .detail-content strong {
    font-weight: 700;
    color: #111;
  }

  .detail-content em {
    font-style: italic;
  }

  .detail-content code {
    background: #f4f4f2;
    padding: 2px 6px;
    border-radius: 5px;
    font-size: .87em;
    font-family: 'SF Mono', monospace;
    color: #555;
  }

  .detail-content pre {
    background: #f4f4f2;
    border-radius: 10px;
    padding: 18px 22px;
    font-size: 13px;
    margin: 16px 0;
    overflow-x: auto;
    font-family: monospace;
    line-height: 1.6;
  }

  .detail-content blockquote {
    border-left: 3px solid #e0e0e0;
    padding-left: 20px;
    color: #777;
    margin: 18px 0;
    font-style: italic;
    font-size: 18px;
  }

  .editor-wrap .ql-toolbar.ql-snow {
    border: none;
    border-bottom: 1px solid #f0f0f0;
    padding: 8px 0;
  }

  .editor-wrap .ql-container.ql-snow {
    border: none;
  }

  .editor-wrap .ql-editor {
    font-size: 15px;
    line-height: 1.75;
    color: #111;
    padding: 14px 0 24px;
    min-height: 160px;
    font-family: 'DM Sans', 'PingFang SC', sans-serif;
  }

  .editor-wrap .ql-editor.ql-blank::before {
    color: #ccc;
    font-style: normal;
  }

  .editor-wrap .ql-editor h2 {
    font-size: 19px;
    font-weight: 600;
    margin: 16px 0 9px;
  }

  .editor-wrap .ql-editor h3 {
    font-size: 15px;
    font-weight: 600;
    margin: 14px 0 6px;
  }

  .editor-wrap .ql-editor p {
    margin: 0 0 9px;
  }

  .editor-wrap .ql-editor code {
    background: #f4f4f2;
    padding: 2px 5px;
    border-radius: 4px;
  }

  .editor-wrap .ql-snow .ql-stroke {
    stroke: #c5c5c5;
  }

  .editor-wrap .ql-snow .ql-fill {
    fill: #c5c5c5;
  }

  .editor-wrap .ql-snow.ql-toolbar button:hover .ql-stroke {
    stroke: #222;
  }

  .editor-wrap .ql-snow.ql-toolbar button.ql-active .ql-stroke {
    stroke: #222;
  }

  ::placeholder {
    color: #c5c5c3;
  }

  ::-webkit-scrollbar {
    width: 4px;
  }

  ::-webkit-scrollbar-thumb {
    background: #d0d0d0;
    border-radius: 4px;
  }

  button, input, textarea, select {
    font-family: inherit;
    outline: none;
  }
`;
