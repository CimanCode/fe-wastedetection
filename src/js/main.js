window.API_BASE_URL = "http://127.0.0.1:8000/api";

// Fetch Register
function registerForm() {
  return {
    username: "",
    email: "",
    password: "",
    async register() {
      try {
        const res = await fetch(`${window.API_BASE_URL}/register/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: this.username,
            email: this.email,
            password: this.password,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (typeof data === "object" && !Array.isArray(data)) {
            let errorMessages = "";
            for (let key in data) {
              if (Array.isArray(data[key])) {
                errorMessages += `${key}: ${data[key].join(", ")}<br>`;
              }
            }

            Swal.fire({
              icon: "error",
              title: "Login Gagal",
              html: errorMessages || "Terjadi kesalahan pada server.",
            });
          } else {
            Swal.fire({
              icon: "error",
              title: "Login Gagal",
              text: data.detail || "Terjadi kesalahan.",
            });
          }
          return;
        }

        Swal.fire({
          icon: "success",
          title: "Berhasil Mendaftar",
          text: "Anda akan diarahkan Ke Halaman Login",
          timer: 2000,
          showConfirmButton: false,
        }).then(() => {
          window.location.href = "./login.html"; // ganti sesuai halaman kamu
        });
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Kesalahan Jaringan",
          text: "Tidak dapat terhubung ke server.",
        });
      }
    },
  };
}

// fetch Login
function loginForm() {
  return {
    username: "",
    password: "",
    async login() {
      try {
        const res = await fetch(`${window.API_BASE_URL}/login/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: this.username,
            password: this.password,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (typeof data === "object" && !Array.isArray(data)) {
            let errorMessages = "";
            for (let key in data) {
              if (Array.isArray(data[key])) {
                errorMessages += `${key}: ${data[key].join(", ")}<br>`;
              }
            }
            Swal.fire({
              icon: "error",
              title: "Login Gagal",
              html: errorMessages || "Terjadi kesalahan pada server.",
            });
          } else {
            Swal.fire({
              icon: "error",
              title: "Login Gagal",
              text: data.detail || "Terjadi kesalahan.",
            });
          }
          return;
        }

        localStorage.setItem("access_token", data.access);
        localStorage.setItem("refresh_token", data.refresh);

        Swal.fire({
          icon: "success",
          title: "Berhasil Login",
          text: "Anda akan diarahkan...",
          timer: 2000,
          showConfirmButton: false,
        }).then(() => {
          window.location.href = "./scan.html"; // ganti sesuai halaman kamu
        });
      } catch (e) {
        Swal.fire({
          icon: "error",
          title: "Kesalahan Jaringan",
          text: "Tidak dapat terhubung ke server.",
        });
      }
    },
  };
}
