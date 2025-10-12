import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ApiService from '../services/ApiService';

const SignIn: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Email validation regex
  const isValidEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      // Use API service to sign in
      await ApiService.signin({ email, password });
      navigate('/dashboard');
    } catch (error: any) {
      setError(error.message || 'Sign in failed');
    }
  };

  return (
    <div style={styles.pageContainer}>
      {/* Background matching landing page */}
      <div style={styles.backgroundOverlay}></div>
      
      {/* Decorative Elements */}
      <div style={styles.decorativeElement1}></div>
      <div style={styles.decorativeElement2}></div>
      <div style={styles.decorativeElement3}></div>
      
      <div style={styles.container}>
        <h2>Sign In</h2>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => {
              setError('');
              setEmail(e.target.value);
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#4CAF50'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#ccc'}
            style={styles.input}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setError('');
              setPassword(e.target.value);
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#4CAF50'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#ccc'}
            style={styles.input}
            required
          />
          {error && <p style={styles.error}>{error}</p>}
          <button 
            type="submit" 
            style={styles.button}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#45a049'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4CAF50'}
          >
            Sign In
          </button>
          <p style={styles.linkText}>
            Don't have an account?{' '}
            <span
              style={styles.link}
              onClick={() => navigate('/signup')}
            >
              Sign Up
            </span>
          </p>
        </form>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  pageContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(135deg, #dbeafe 0%, #ffffff 50%, #fed7aa 100%)',
    opacity: 0.9,
    zIndex: 1,
  },
  decorativeElement1: {
    position: 'absolute',
    top: '80px',
    left: '40px',
    width: '80px',
    height: '80px',
    backgroundColor: '#dbeafe',
    borderRadius: '50%',
    opacity: 0.2,
    animation: 'pulse 2s infinite',
    zIndex: 2,
  },
  decorativeElement2: {
    position: 'absolute',
    bottom: '80px',
    right: '40px',
    width: '64px',
    height: '64px',
    backgroundColor: '#fed7aa',
    borderRadius: '50%',
    opacity: 0.2,
    animation: 'pulse 2s infinite 1s',
    zIndex: 2,
  },
  decorativeElement3: {
    position: 'absolute',
    top: '33%',
    right: '80px',
    width: '48px',
    height: '48px',
    backgroundColor: '#bbf7d0',
    borderRadius: '50%',
    opacity: 0.2,
    animation: 'pulse 2s infinite 0.5s',
    zIndex: 2,
  },
  container: {
    maxWidth: '400px',
    width: '100%',
    padding: '30px',
    border: '1px solid #ddd',
    borderRadius: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    backdropFilter: 'blur(10px)',
    position: 'relative',
    zIndex: 10,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  input: {
    padding: '12px',
    fontSize: '16px',
    borderRadius: '8px',
    border: '1px solid #ccc',
    outline: 'none',
    transition: 'border-color 0.3s ease',
  },
  button: {
    padding: '12px',
    backgroundColor: '#4CAF50',
    color: 'white',
    fontSize: '16px',
    fontWeight: 'bold',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
  },
  error: {
    color: '#e74c3c',
    fontSize: '14px',
    fontWeight: '500',
  },
  linkText: {
    fontSize: '14px',
    color: '#666',
    marginTop: '15px',
  },
  link: {
    color: '#4CAF50',
    cursor: 'pointer',
    textDecoration: 'underline',
    fontWeight: '500',
  },
};

export default SignIn;