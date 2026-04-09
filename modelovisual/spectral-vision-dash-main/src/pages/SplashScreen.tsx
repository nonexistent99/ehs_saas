import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '@/assets/logo-ehs.png';

const SplashScreen = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 3000;
    const interval = 30;
    const increment = 100 / (duration / interval);

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          clearInterval(timer);
          return 100;
        }
        return next;
      });
    }, interval);

    const redirectTimer = setTimeout(() => {
      navigate('/login');
    }, duration);

    return () => {
      clearInterval(timer);
      clearTimeout(redirectTimer);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      {/* Logo Container with Neon Pulse */}
      <div className="relative">
        {/* Outer glow layers */}
        <div className="absolute inset-0 -m-8 rounded-full animate-[splash-pulse_2s_ease-in-out_infinite] bg-[radial-gradient(circle,rgba(255,107,0,0.4)_0%,transparent_70%)]" />
        <div className="absolute inset-0 -m-4 rounded-full animate-[splash-pulse_2s_ease-in-out_infinite_0.5s] bg-[radial-gradient(circle,rgba(255,107,0,0.3)_0%,transparent_60%)]" />
        
        {/* Logo */}
        <img 
          src={logo} 
          alt="EHS Logo" 
          className="w-[150px] h-[150px] object-contain relative z-10 animate-[logo-breathe_2s_ease-in-out_infinite]"
        />
      </div>

      {/* Progress Bar Container */}
      <div className="mt-12 w-64">
        <div className="h-1 bg-muted/30 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-100 ease-linear animate-[progress-glow_1.5s_ease-in-out_infinite]"
            style={{ 
              width: `${progress}%`,
              background: 'linear-gradient(90deg, hsl(24, 100%, 50%) 0%, hsl(38, 100%, 55%) 100%)',
              boxShadow: '0 0 10px rgba(255, 107, 0, 0.8), 0 0 20px rgba(255, 107, 0, 0.5), 0 0 30px rgba(255, 107, 0, 0.3)'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
