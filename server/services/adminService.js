const BASE_URL = "http://localhost:4000/api/admin";


export const adminLogin = async (email, password) => {
  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  return res.json();
};


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