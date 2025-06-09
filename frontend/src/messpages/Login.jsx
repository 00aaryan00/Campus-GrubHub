import React, { useState, useEffect } from "react";
import { signInWithPopup, onAuthStateChanged } from "firebase/auth";
import { auth, provider } from "../firebase";

function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Check if user is already logged in
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("User already logged in:", user);
        // Redirect to home page
        window.location.href = "/home";
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    
    try {
      console.log("Attempting login...");
      
      // Configure the provider
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      console.log("✅ Login Success:", user);
      console.log("User details:", {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      });
      
      alert(`Welcome ${user.displayName}!`);
      
      // Redirect to home page
      window.location.href = "/home";
      
    } catch (error) {
      console.error("❌ Login Error:", error);
      
      let errorMessage = "Login failed. Please try again.";
      
      switch (error.code) {
        case 'auth/popup-closed-by-user':
          errorMessage = "Login was cancelled. Please try again.";
          break;
        case 'auth/popup-blocked':
          errorMessage = "Popup was blocked. Please allow popups and try again.";
          break;
        case 'auth/cancelled-popup-request':
          errorMessage = "Login request was cancelled.";
          break;
        case 'auth/network-request-failed':
          errorMessage = "Network error. Please check your connection.";
          break;
        case 'auth/internal-error':
          errorMessage = "Internal error. Please check your Firebase configuration.";
          break;
        case 'auth/invalid-api-key':
          errorMessage = "Invalid API key. Please check Firebase configuration.";
          break;
        case 'auth/unauthorized-domain':
          errorMessage = "Domain not authorized. Please add localhost to Firebase authorized domains.";
          break;
        default:
          errorMessage = `Error: ${error.message}`;
      }
      
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '10px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        textAlign: 'center',
        maxWidth: '400px',
        width: '100%'
      }}>
        <h1 style={{ 
          color: '#333', 
          marginBottom: '0.5rem',
          fontSize: '2rem'
        }}>
          🍽️ Campus GrubHub
        </h1>
        
        <p style={{ 
          color: '#666', 
          marginBottom: '2rem',
          fontSize: '1.1rem'
        }}>
          Vote on your favorite mess meals!
        </p>
        
        {error && (
          <div style={{
            backgroundColor: '#ffebee',
            color: '#c62828',
            padding: '1rem',
            borderRadius: '5px',
            marginBottom: '1rem',
            border: '1px solid #ffcdd2'
          }}>
            {error}
          </div>
        )}
        
        <button 
          onClick={handleLogin}
          disabled={loading}
          style={{
            backgroundColor: loading ? '#ccc' : '#4285f4',
            color: 'white',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '5px',
            fontSize: '16px',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            width: '100%',
            transition: 'background-color 0.3s'
          }}
        >
          {loading ? (
            <>
              <div style={{
                width: '20px',
                height: '20px',
                border: '2px solid #fff',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              Signing in...
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>
        
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '5px',
          fontSize: '0.9rem',
          color: '#666'
        }}>
          <strong>Troubleshooting:</strong>
          <ul style={{ textAlign: 'left', margin: '0.5rem 0' }}>
            <li>Allow popups in your browser</li>
            <li>Check your internet connection</li>
            <li>Try refreshing the page</li>
          </ul>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default Login;