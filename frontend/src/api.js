
const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

// --------------------------------------------------
// TOKEN MANAGEMENT
// --------------------------------------------------

export function getToken() {
  return localStorage.getItem("skillbridge_token");
}

export function setSession(token, user) {
  if (!token) {
    throw new Error("Authentication token is missing.");
  }

  localStorage.setItem("skillbridge_token", token);

  if (user) {
    localStorage.setItem(
      "skillbridge_user",
      JSON.stringify(user)
    );
  }
}

export function clearSession() {
  localStorage.removeItem("skillbridge_token");
  localStorage.removeItem("skillbridge_user");
}

export function getUser() {
  try {
    return JSON.parse(
      localStorage.getItem("skillbridge_user") || "null"
    );
  } catch {
    return null;
  }
}

// --------------------------------------------------
// API REQUEST HANDLER
// --------------------------------------------------

export async function api(path, options = {}) {
  const headers = {
    ...(options.headers || {}),
  };

  const token = getToken();

  // Attach JWT authentication token.
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const isFormData =
    typeof FormData !== "undefined" &&
    options.body instanceof FormData;

  const isUrlEncoded =
    typeof URLSearchParams !== "undefined" &&
    options.body instanceof URLSearchParams;

  // Automatically set JSON content type.
  if (
    options.body &&
    !isFormData &&
    !isUrlEncoded &&
    !headers["Content-Type"]
  ) {
    headers["Content-Type"] = "application/json";
  }

  let response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  } catch (error) {
    console.error("SkillBridge API connection error:", error);

    throw new Error(
      `Cannot connect to SkillBridge API at ${API_BASE}. Check that FastAPI is running.`
    );
  }

  // --------------------------------------------------
  // ERROR HANDLING
  // --------------------------------------------------

  if (!response.ok) {
    let message = `Request failed (${response.status})`;

    try {
      const data = await response.json();

      if (typeof data.detail === "string") {
        message = data.detail;
      } else if (data.detail) {
        message = JSON.stringify(data.detail);
      } else if (data.message) {
        message = data.message;
      }
    } catch {
      // Keep default error message.
    }

    if (response.status === 401) {
      console.error("Authentication failed:", message);
    }

    if (response.status === 403) {
      console.error("Access forbidden:", message);
    }

    throw new Error(message);
  }

  // --------------------------------------------------
  // EMPTY RESPONSE
  // --------------------------------------------------

  if (response.status === 204) {
    return null;
  }

  // --------------------------------------------------
  // RESPONSE HANDLING
  // --------------------------------------------------

  const contentType =
    response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  // PDF, DOCX and other binary responses.
  return response.blob();
}
