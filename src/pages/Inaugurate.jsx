import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import logoImg from '../assets/rotary-logo.png';
import applauseMp3 from '../assets/applause.mp3';
import '../index.css';

export const Inaugurate = () => {
  const [isLaunching, setIsLaunching] = useState(false);
  const [countdown, setCountdown] = useState(7);

  useEffect(() => {
    let timer;
    if (isLaunching && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (isLaunching && countdown === 0) {
      window.location.href = '/?page=dashboard&inaugurated=true';
    }
    return () => clearTimeout(timer);
  }, [isLaunching, countdown]);
  const playApplause = () => {
    try {
      const audio = new Audio(applauseMp3);
      audio.volume = 0.5;
      audio.play();
    } catch (err) {
      console.log('Audio playback failed', err);
    }
  };

  const handleLaunch = () => {
    setIsLaunching(true);
    playApplause();

    // Confetti effect
    const duration = 10 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#003DA5', '#D89B00', '#ffffff'],
        zIndex: 10000
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#003DA5', '#D89B00', '#ffffff'],
        zIndex: 10000
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  return (
    <div className="inaugurate-container">
      <div className="inaugurate-content">
        <img
          src={logoImg}
          alt="Rotary Logo"
          className={`inaugurate-logo ${isLaunching ? 'launch-animation' : ''}`}
        />

        <h1 className="splash-title">
          <span className="splash-title-white">Rotary</span>
          <span className="splash-title-gold">Pulse</span>
        </h1>

        <div className="splash-subtitle">
          The heartbeat of your Rotary Club
        </div>

        {!isLaunching ? (
          <button
            className="btn btn-primary inaugurate-launch-btn"
            onClick={handleLaunch}
          >
            Launch App
          </button>
        ) : (
          <div className="inaugurate-loading">
            <div className="splash-loader-bar" style={{ marginTop: '30px' }}>
              <div className="splash-loader-progress"></div>
            </div>
            <p className="splash-status" style={{ marginTop: '10px' }}>
              Loading App in {countdown}...
            </p>
          </div>
        )}
      </div>

      <img
        src={logoImg}
        alt="Rotary Watermark"
        className="splash-watermark"
      />
    </div>
  );
};
