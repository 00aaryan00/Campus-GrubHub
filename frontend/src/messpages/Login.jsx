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
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #FFDAB9 0%, #FFF7ED 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
    }}>
      {/* Floating Food Icons */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '10%',
        fontSize: '3rem',
        opacity: '0.4',
        zIndex: 1,
        animation: 'float 6s ease-in-out infinite',
        boxShadow: '0 0 10px rgba(251, 191, 36, 0.3)'
      }}>🍕</div>
      <div style={{
        position: 'absolute',
        top: '20%',
        right: '15%',
        fontSize: '3rem',
        opacity: '0.4',
        zIndex: 1,
        animation: 'float 4s ease-in-out infinite reverse',
        boxShadow: '0 0 10px rgba(251, 191, 36, 0.3)'
      }}>🍔</div>
      <div style={{
        position: 'absolute',
        bottom: '15%',
        left: '20%',
        fontSize: '3rem',
        opacity: '0.4',
        zIndex: 1,
        animation: 'float 5s ease-in-out infinite',
        boxShadow: '0 0 10px rgba(251, 191, 36, 0.3)'
      }}>🌮</div>
      <div style={{
        position: 'absolute',
        bottom: '25%',
        right: '10%',
        fontSize: '3rem',
        opacity: '0.4',
        zIndex: 1,
        animation: 'float 7s ease-in-out infinite reverse',
        boxShadow: '0 0 10px rgba(251, 191, 36, 0.3)'
      }}>🍜</div>
      <div style={{
        position: 'absolute',
        top: '30%',
        left: '15%',
        fontSize: '3rem',
        opacity: '0.4',
        zIndex: 1,
        animation: 'float 5.5s ease-in-out infinite',
        boxShadow: '0 0 10px rgba(251, 191, 36, 0.3)'
      }}>🍣</div>
      <div style={{
        position: 'absolute',
        bottom: '20%',
        right: '20%',
        fontSize: '3rem',
        opacity: '0.4',
        zIndex: 1,
        animation: 'float 6.5s ease-in-out infinite reverse',
        boxShadow: '0 0 10px rgba(251, 191, 36, 0.3)'
      }}>🥐</div>
      <div style={{
        position: 'absolute',
        top: '15%',
        right: '25%',
        fontSize: '3rem',
        opacity: '0.4',
        zIndex: 1,
        animation: 'float 4.5s ease-in-out infinite',
        boxShadow: '0 0 10px rgba(251, 191, 36, 0.3)'
      }}>🍦</div>
      <div style={{
        position: 'absolute',
        bottom: '10%',
        left: '25%',
        fontSize: '3rem',
        opacity: '0.4',
        zIndex: 1,
        animation: 'float 6.2s ease-in-out infinite reverse',
        boxShadow: '0 0 10px rgba(251, 191, 36, 0.3)'
      }}>🥗</div>
      <div style={{
        position: 'absolute',
        top: '5%',
        right: '30%',
        fontSize: '3rem',
        opacity: '0.4',
        zIndex: 1,
        animation: 'float 5.8s ease-in-out infinite',
        boxShadow: '0 0 10px rgba(251, 191, 36, 0.3)'
      }}>🥪</div>
      <div style={{
        position: 'absolute',
        bottom: '30%',
        left: '5%',
        fontSize: '3rem',
        opacity: '0.4',
        zIndex: 1,
        animation: 'float 6.8s ease-in-out infinite reverse',
        boxShadow: '0 0 10px rgba(251, 191, 36, 0.3)'
      }}>🍟</div>
      <div style={{
        position: 'absolute',
        top: '25%',
        left: '30%',
        fontSize: '3rem',
        opacity: '0.4',
        zIndex: 1,
        animation: 'float 4.8s ease-in-out infinite',
        boxShadow: '0 0 10px rgba(251, 191, 36, 0.3)'
      }}>🍰</div>
      <div style={{
        position: 'absolute',
        bottom: '5%',
        right: '5%',
        fontSize: '3rem',
        opacity: '0.4',
        zIndex: 1,
        animation: 'float 7.2s ease-in-out infinite reverse',
        boxShadow: '0 0 10px rgba(251, 191, 36, 0.3)'
      }}>🥤</div>

      <div style={{
        background: '#F8FAFC',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        padding: '3rem 2.5rem',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
        textAlign: 'center',
        maxWidth: '450px',
        width: '100%',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        position: 'relative',
        overflow: 'hidden',
        zIndex: 2
      }}>
        {/* Decorative elements */}
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '100px',
          height: '100px',
          background: 'linear-gradient(45deg, #FF6B6B, #FBBF24)',
          borderRadius: '50%',
          opacity: '0.1'
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: '-30px',
          left: '-30px',
          width: '60px',
          height: '60px',
          background: 'linear-gradient(45deg, #86EFAC, #4ADE80)',
          borderRadius: '50%',
          opacity: '0.1'
        }}></div>

        {/* Logo and Title */}
        <div style={{
          marginBottom: '2rem',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{
            fontSize: '3.5rem',
            marginBottom: '0.5rem',
            background: 'linear-gradient(45deg, #FF6B6B, #FBBF24)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            🍽️
          </div>
          <h1 style={{ 
            color: '#2D3748', 
            marginBottom: '0.5rem',
            fontSize: '2.5rem',
            fontWeight: '800',
            letterSpacing: '-0.02em'
          }}>
            Campus GrubHub
          </h1>
          
          <p style={{ 
            color: '#4A5568', 
            marginBottom: '0.5rem',
            fontSize: '1.2rem',
            fontWeight: '500'
          }}>
            Where Campus Eats, Students Meet! 🎓
          </p>
          
          <p style={{ 
            color: '#718096', 
            fontSize: '0.95rem',
            fontStyle: 'italic'
          }}>
            "Vote, Review, Discover - Your Mess, Your Voice!"
          </p>
        </div>

        {/* Feature highlights */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          marginBottom: '2rem',
          padding: '1rem',
          background: 'linear-gradient(135deg, #F8FAFC 0%, #EDF2F7 100%)',
          borderRadius: '12px',
          border: '1px solid #E2E8F0'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '1.5rem', 
              marginBottom: '0.25rem', 
              color: '#86EFAC',
              textShadow: '0 0 5px rgba(251, 191, 36, 0.3)'
            }}>📊</div>
            <div style={{ fontSize: '0.8rem', color: '#4A5568', fontWeight: '600' }}>Vote</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '1.5rem', 
              marginBottom: '0.25rem', 
              color: '#FBBF24',
              textShadow: '0 0 5px rgba(251, 191, 36, 0.3)'
            }}>⭐</div>
            <div style={{ fontSize: '0.8rem', color: '#4A5568', fontWeight: '600' }}>Review</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '1.5rem', 
              marginBottom: '0.25rem', 
              color: '#FF6B6B',
              textShadow: '0 0 5px rgba(251, 191, 36, 0.3)'
            }}>🔥</div>
            <div style={{ fontSize: '0.8rem', color: '#4A5568', fontWeight: '600' }}>Trending</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '1.5rem', 
              marginBottom: '0.25rem', 
              color: '#86EFAC',
              textShadow: '0 0 5px rgba(251, 191, 36, 0.3)'
            }}>🏆</div>
            <div style={{ fontSize: '0.8rem', color: '#4A5568', fontWeight: '600' }}>Best Meals</div>
          </div>
        </div>
        
        {error && (
          <div style={{
            backgroundColor: '#FED7D7',
            color: '#C53030',
            padding: '1rem',
            borderRadius: '12px',
            marginBottom: '1.5rem',
            border: '1px solid #FEB2B2',
            fontSize: '0.9rem',
            fontWeight: '500'
          }}>
            {error}
          </div>
        )}
        
        <button 
          onClick={handleLogin}
          disabled={loading}
          style={{
            background: loading ? '#A0AEC0' : 'linear-gradient(135deg, #FF6B6B 0%, #EF4444 100%)',
            color: 'white',
            padding: '16px 24px',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            width: '100%',
            transition: 'all 0.3s ease',
            boxShadow: loading ? 'none' : '0 4px 15px rgba(239, 68, 68, 0.4)',
            transform: loading ? 'none' : 'translateY(0)',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.5)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.4)';
            }
          }}
        >
          {loading ? (
            <>
              <div style={{
                width: '20px',
                height: '20px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTop: '2px solid #fff',
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

        {/* Campus-specific slogans */}
        <div style={{
          marginTop: '2rem',
          padding: '1.5rem',
          background: 'linear-gradient(135deg, #FFEAA7 0%, #FAB1A0 100%)',
          borderRadius: '12px',
          fontSize: '0.9rem',
          color: '#2D3748',
          position: 'relative'
        }}>
          <div style={{ fontWeight: '700', marginBottom: '0.5rem', fontSize: '1rem' }}>
            🚀 Join the Campus Food Revolution!
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <strong>✨ What awaits you:</strong>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', textAlign: 'left' }}>
            <div>🥄 Rate daily mess meals</div>
            <div>🍲 Discover trending dishes</div>
            <div>🥟 Share honest reviews</div>
            <div>🍗 Vote for favorites</div>
            <div>☕ Be notified about cafe dishes</div>
            <div>📝 Give reviews to cafe dishes</div>
          </div>
        </div>

        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          backgroundColor: '#F8FAFC',
          borderRadius: '8px',
          fontSize: '0.85rem',
          color: '#718096',
          border: '1px solid #E2E8F0'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
            🔧 Having trouble logging in?
          </div>
          <div style={{ textAlign: 'left' }}>
            • Enable popups in your browser<br/>
            • Check your internet connection<br/>
            • Contact admin if issues persist
          </div>
        </div>

        {/* Footer tagline */}
        <div style={{
          marginTop: '1.5rem',
          fontSize: '0.8rem',
          color: '#A0AEC0',
          fontStyle: 'italic'
        }}>
          "From Students, For Students" 💙
        </div>
      </div>
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
}

export default Login;