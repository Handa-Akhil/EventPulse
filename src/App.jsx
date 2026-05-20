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
  connectSocket,
  disconnectSocket,
} from "./socket";
import {
  getSessionUser,
  loginWithGoogle,
  loginUser,
  logoutUser,
  registerUser,
  updateUserPreferences,
} from "./services/api";
import {
  getAdminSession,
  isAdminSessionActive,
  logoutAdmin,
} from "./services/adminService";


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
  const [chatbotWelcomeIntent, setChatbotWelcomeIntent] = useState(null);

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(
    () => isAdminSessionActive()
  );

  const handleAdminLogin = () => {
    setIsAdminLoggedIn(true);
  };

  const handleAdminLogout = async () => {
    await logoutAdmin();
    setIsAdminLoggedIn(false);
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

  useEffect(() => {
    if (!isAdminLoggedIn) {
      return;
    }

    void getAdminSession().catch(() => {
      setIsAdminLoggedIn(false);
    });
  }, [isAdminLoggedIn]);

  useEffect(() => {
    if (!currentUser?.id) {
      disconnectSocket();
      return;
    }

    connectSocket();

    return () => {
      disconnectSocket();
    };
  }, [currentUser?.id]);

  const handleLogin = async (credentials) => {
    const user = await loginUser(credentials);
    setCurrentUser(user);
    setChatbotWelcomeIntent({
      type: "login",
      stamp: Date.now(),
      userId: user.id,
    });
    return user;
  };

  const handleGoogleLogin = async (payload) => {
    const user = await loginWithGoogle(payload);
    setCurrentUser(user);
    setChatbotWelcomeIntent({
      type: "google",
      stamp: Date.now(),
      userId: user.id,
    });
    return user;
  };

  const handleSignup = async (payload) => {
    const user = await registerUser(payload);
    setCurrentUser(user);
    setChatbotWelcomeIntent({
      type: "signup",
      stamp: Date.now(),
      userId: user.id,
    });
    return user;
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setChatbotWelcomeIntent(null);
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
              <AuthPage
                onGoogleLogin={handleGoogleLogin}
                onLogin={handleLogin}
                onSignup={handleSignup}
              />
            )
          }
        />

        {/* 🏠 DASHBOARD */}
        <Route
          path="/"
          element={
            <ProtectedRoute currentUser={currentUser}>
              <Dashboard
                chatbotWelcomeIntent={chatbotWelcomeIntent}
                currentUser={currentUser}
                isPreferenceOpen={isPreferenceOpen}
                onChatbotWelcomeShown={() => setChatbotWelcomeIntent(null)}
                onLogout={handleLogout}
              />
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
              <AdminPanel onLogout={() => void handleAdminLogout()} />
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
