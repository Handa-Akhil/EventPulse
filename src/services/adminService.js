const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api") + "/admin";


export const getPendingEvents = async () => {
  const res = await fetch(`${BASE_URL}/pending-events`);
  return res.json();
};


export const approveEvent = async (id) => {
  await fetch(`${BASE_URL}/approve/${id}`, {
    method: "POST",
  });
};


export const rejectEvent = async (id, reason) => {
  await fetch(`${BASE_URL}/reject/${id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reason }),
  });
};


export const loginAdmin = async (email, password) => {
  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.json(); 
};


export const getAllEvents = async () => {
  const res = await fetch(`${BASE_URL}/all-events`);
  return res.json();
};


export const addEventManual = async (payload) => {
  const res = await fetch(`${BASE_URL}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
};


export const deleteEvent = async (id) => {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "DELETE",
  });
  return res.json();
};