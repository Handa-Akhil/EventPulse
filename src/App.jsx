import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AuthPage from "./components/AuthPage";
import Dashboard from "./components/Dashboard";
import EventDetails from "./components/EventDetails";
import PreferenceModal from "./components/PreferenceModal";
import AdminPanel from "./components/AdminPanel";
import AdminLogin from "./components/AdminLogin";
import CreateEvent from "./components/CreateEvent";
import MyTickets from "./components/MyTickets";

import {
  getSessionUser,
  loginUser,
  logoutUser,
  registerUser,
  updateUserPreferences,
} from "./services/api";


function ProtectedRoute({ currentUser, children }) {
  if (!currentUser) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isPreferenceOpen, setIsPreferenceOpen] = useState(false);

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(
    () => localStorage.getItem("adminLoggedIn") === "true"
  );

  const handleAdminLogin = () => {
    setIsAdminLoggedIn(true);
    localStorage.setItem("adminLoggedIn", "true");
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    localStorage.removeItem("adminLoggedIn");
  };


  useEffect(() => {
    let ignore = false;

    async function restoreSession() {
      try {
        const user = await getSessionUser();

        if (!ignore) {
          setCurrentUser(user);
        }
      } catch {
        if (!ignore) {
          setCurrentUser(null);
        }
      } finally {
        if (!ignore) {
          setIsBootstrapping(false);
        }
      }
    }

    void restoreSession();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    setIsPreferenceOpen(Boolean(currentUser && !currentUser.hasOnboarded));
  }, [currentUser]);

  const handleLogin = async (credentials) => {
    const user = await loginUser(credentials);
    setCurrentUser(user);
    return user;
  };

  const handleSignup = async (payload) => {
    const user = await registerUser(payload);
    setCurrentUser(user);
    return user;
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
  };

  const handleSavePreferences = async (preferences) => {
    if (!currentUser) return;

    const updatedUser = await updateUserPreferences(preferences);
    setCurrentUser(updatedUser);
  };

  
  if (isBootstrapping) {
    return (
      <main className="page-shell auth-page">
        <div className="empty-state panel fade-up">
          <h2>Loading EventPulse...</h2>
          <p>Connecting to the API and restoring your session.</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <Routes>
        {/* 🔐 AUTH PAGE */}
        <Route
          path="/auth"
          element={
            currentUser ? (
              <Navigate to="/" replace />
            ) : (
              <AuthPage onLogin={handleLogin} onSignup={handleSignup} />
            )
          }
        />

        {/* 🏠 DASHBOARD */}
        <Route
          path="/"
          element={
            <ProtectedRoute currentUser={currentUser}>
              <Dashboard currentUser={currentUser} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />

        {/* 🎫 EVENT DETAILS */}
        <Route
          path="/events/:eventId"
          element={
            <ProtectedRoute currentUser={currentUser}>
              <EventDetails />
            </ProtectedRoute>
          }
        />

        {/* 🆕 CREATE EVENT USER */}
        <Route
          path="/create-event"
          element={
            <ProtectedRoute currentUser={currentUser}>
              <CreateEvent />
            </ProtectedRoute>
          }
        />

        {/* 🎟️ MY TICKETS */}
        <Route
          path="/my-tickets"
          element={
            <ProtectedRoute currentUser={currentUser}>
              <MyTickets />
            </ProtectedRoute>
          }
        />

        {/* 🔥 ADMIN LOGIN */}
        <Route
          path="/admin/login"
          element={
            isAdminLoggedIn ? (
              <Navigate to="/admin" replace />
            ) : (
              <AdminLogin onLogin={handleAdminLogin} />
            )
          }
        />

        {/* 🔥 ADMIN PANEL */}
        <Route
          path="/admin"
          element={
            isAdminLoggedIn ? (
              <AdminPanel onLogout={handleAdminLogout} />
            ) : (
              <Navigate to="/admin/login" replace />
            )
          }
        />

        {/* 🔁 FALLBACK */}
        <Route
          path="*"
          element={<Navigate to={currentUser ? "/" : "/auth"} replace />}
        />
      </Routes>

      {/* 🎯 PREFERENCE MODAL */}
      <PreferenceModal
        initialSelected={currentUser?.preferences ?? []}
        open={isPreferenceOpen}
        onSave={handleSavePreferences}
      />
    </>
  );
}