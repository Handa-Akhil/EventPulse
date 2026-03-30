import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginAdmin } from "../services/adminService";

export default function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await loginAdmin(email, password);
      if (res.success) {
        onLogin();
        navigate("/admin");
      } else {
        setError(res.message || "Invalid credentials");
      }
    } catch (err) {
      setError("Failed to login. Ensure server is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main 
      className="page-shell" 
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
        padding: "20px"
      }}
    >
      <div 
        className="panel fade-up" 
        style={{
          maxWidth: "400px",
          width: "100%",
          padding: "40px 30px",
          borderRadius: "16px",
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          textAlign: "center"
        }}
      >
        <div style={{ marginBottom: "24px" }}>
          <span style={{ fontSize: "48px", display: "block", marginBottom: "16px" }}>👑</span>
          <h2 style={{ color: "white", fontSize: "24px", fontWeight: "700", margin: 0 }}>Admin Portal</h2>
          <p style={{ color: "#94a3b8", fontSize: "14px", marginTop: "8px" }}>Sign in to moderate EventPulse</p>
        </div>

        {error && (
          <div style={{ 
            backgroundColor: "rgba(239, 68, 68, 0.1)", 
            color: "#f87171", 
            padding: "12px", 
            borderRadius: "8px",
            marginBottom: "20px",
            fontSize: "14px",
            border: "1px solid rgba(239, 68, 68, 0.2)"
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "left" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <span style={{ color: "#e2e8f0", fontSize: "14px", fontWeight: "500" }}>Admin Email</span>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                backgroundColor: "rgba(0, 0, 0, 0.2)",
                color: "white",
                outline: "none",
                transition: "all 0.2s"
              }}
              placeholder="akhilhanda855@gmail.com"
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <span style={{ color: "#e2e8f0", fontSize: "14px", fontWeight: "500" }}>Password</span>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                backgroundColor: "rgba(0, 0, 0, 0.2)",
                color: "white",
                outline: "none",
                transition: "all 0.2s"
              }}
              placeholder="••••••••"
            />
          </label>
          
          <button 
            type="submit" 
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              marginTop: "8px",
              borderRadius: "8px",
              backgroundColor: "#3b82f6",
              color: "white",
              fontWeight: "600",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              transition: "background-color 0.2s",
              boxShadow: "0 4px 6px -1px rgba(59, 130, 246, 0.5)"
            }}
          >
            {loading ? "Authenticating..." : "Login to Dashboard"}
          </button>
        </form>
        
        <div style={{ marginTop: "32px", borderTop: "1px solid rgba(255, 255, 255, 0.1)", paddingTop: "20px" }}>
          <button 
            type="button" 
            onClick={() => navigate("/auth")}
            style={{
              background: "none",
              border: "none",
              color: "#94a3b8",
              fontSize: "14px",
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: "4px"
            }}
          >
            ← Return to User Login
          </button>
        </div>
      </div>
    </main>
  );
}
