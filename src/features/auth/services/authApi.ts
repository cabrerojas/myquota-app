export async function login(email: string, password: string) {
  // Simulación de autenticación
  if (email === "test@email.com" && password === "123456") {
    return { name: "Guillermo Cabrera" };
  } else {
    throw new Error("Credenciales incorrectas");
  }
}

export async function loginWithGoogle(accessToken: string) {
  const response = await fetch("http://localhost:3000/api/login/google", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token: accessToken }),
  });

  if (!response.ok) {
    throw new Error("Error en la autenticación con Google");
  }

  return await response.json();
}
