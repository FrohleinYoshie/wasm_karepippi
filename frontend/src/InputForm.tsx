import React, { useState, useEffect } from 'react';
import './styles.css';

declare global {
  interface Window {
    validateKanaWasm: (input: string) => { isValid: boolean; message: string };
    replaceTextWasm: (search: string, replace: string, text: string) => { displayText: string; error: string };
    Go: any;
  }
}

const InputForm: React.FC = () => {
  const [kanaInput, setKanaInput] = useState('');
  const [shortText, setShortText] = useState('');
  const [longText, setLongText] = useState('');
  const [displayText, setDisplayText] = useState('');
  const [error, setError] = useState('');
  const [wasmLoaded, setWasmLoaded] = useState(false);

  // WebAssemblyの初期化
  useEffect(() => {
    const initWasm = async () => {
      try {
        const go = new window.Go();
        const result = await WebAssembly.instantiateStreaming(
          fetch('/wasm/main.wasm'),
          go.importObject
        );
        go.run(result.instance);
        setWasmLoaded(true);
      } catch (error) {
        console.error('Failed to load WASM:', error);
        setError('WebAssemblyの読み込みに失敗しました');
      }
    };

    initWasm();
  }, []);

  // 入力の処理
  const handleKanaInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setKanaInput(value);

    if (wasmLoaded && window.validateKanaWasm) {
      const result = window.validateKanaWasm(value);
      setError(result.message);
    }
  };

  const handleShortTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShortText(e.target.value);
  };

  const handleLongTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLongText(e.target.value);
  };

  // 文字列置換の実行
  useEffect(() => {
    if (!wasmLoaded || !window.replaceTextWasm) return;

    const result = window.replaceTextWasm(kanaInput, shortText, longText);
    setDisplayText(result.displayText);
    if (result.error) {
      setError(result.error);
    }
  }, [kanaInput, shortText, longText, wasmLoaded]);

  return (
    <div className="input-form">
      <h1>文字列置換フォーム (WebAssembly)</h1>
      <div className="status-indicator">
        {wasmLoaded ? (
          <span className="status-loaded">WebAssembly Ready ✓</span>
        ) : (
          <span className="status-loading">Loading WebAssembly...</span>
        )}
      </div>
      <div className="input-container">
        <label htmlFor="kana">検索する文字（10文字まで）</label>
        <input
          id="kana"
          type="text"
          value={kanaInput}
          onChange={handleKanaInputChange}
          placeholder="置換したい文字列を入力"
        />
        {error && <p className="error-message">{error}</p>}
      </div>
      <div className="input-container">
        <label htmlFor="shortText">置換後の文字（30文字まで）</label>
        <input
          id="shortText"
          type="text"
          value={shortText}
          onChange={handleShortTextChange}
          placeholder="置換後の文字列を入力"
        />
      </div>
      <div className="input-container">
        <label htmlFor="longText">テキスト</label>
        <textarea
          id="longText"
          value={longText}
          onChange={handleLongTextChange}
          placeholder="文章を入力"
          rows={4}
        />
      </div>
      <div className="display-text">
        <h2>変換結果</h2>
        <p>{displayText}</p>
      </div>
    </div>
  );
};

export default InputForm;