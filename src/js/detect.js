window.API_BASE_URL = "http://127.0.0.1:8000/api";
BASE_URL = "http://127.0.0.1:8000";

function scanCamera() {
  return {
    video: null,
    canvas: null,
    ctx: null,
    API_URL: `${window.API_BASE_URL}/detect/yolo-realtime/`,
    lastDetections: [],
    isDetecting: false,
    frameInterval: 500,
    detectIntervalId: null,
    scanning: false,

    startScan() {
      this.video = this.$refs.video;
      this.canvas = this.$refs.canvas;
      this.ctx = this.canvas.getContext("2d");

      this.canvas.width = 640;
      this.canvas.height = 480;

      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          this.video.srcObject = stream;
          this.video.play();
          this.scanning = true;
          requestAnimationFrame(this.renderLoop.bind(this));
          this.detectIntervalId = setInterval(
            this.detectFrame.bind(this),
            this.frameInterval
          );
        })
        .catch((err) => {
          console.error("Kamera gagal diakses", err);
          Swal.fire("Akses Kamera Gagal", "Periksa izin kamera.", "error");
        });
    },

    stopScan() {
      if (this.video?.srcObject) {
        this.video.srcObject.getTracks().forEach((track) => track.stop());
      }
      clearInterval(this.detectIntervalId);
      this.scanning = false;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    },

    renderLoop() {
      if (!this.scanning) return;
      this.ctx.drawImage(
        this.video,
        0,
        0,
        this.canvas.width,
        this.canvas.height
      );
      this.drawDetections();
      requestAnimationFrame(this.renderLoop.bind(this));
    },

    detectFrame() {
      if (this.isDetecting || !this.video) return;
      this.isDetecting = true;

      const tmpCanvas = document.createElement("canvas");
      tmpCanvas.width = 416;
      tmpCanvas.height = 416;
      const tmpCtx = tmpCanvas.getContext("2d");
      tmpCtx.drawImage(this.video, 0, 0, 416, 416);

      tmpCanvas.toBlob((blob) => {
        const formData = new FormData();
        formData.append("frame", blob, "frame.jpg");

        fetch(this.API_URL, {
          method: "POST",
          body: formData,
        })
          .then((res) => res.json())
          .then((data) => {
            this.lastDetections = data.detections || [];
          })
          .catch((err) => {
            console.error("Gagal deteksi:", err);
          })
          .finally(() => {
            this.isDetecting = false;
          });
      }, "image/jpeg");
    },

    drawDetections() {
      this.lastDetections.forEach((det) => {
        const [x1, y1, x2, y2] = det.bbox;
        const label = `${det.label} (${(det.confidence * 100).toFixed(1)}%)`;

        this.ctx.strokeStyle = "lime";
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

        this.ctx.fillStyle = "black";
        this.ctx.fillRect(
          x1,
          y1 - 20,
          this.ctx.measureText(label).width + 10,
          20
        );

        this.ctx.fillStyle = "lime";
        this.ctx.font = "16px Arial";
        this.ctx.fillText(label, x1 + 5, y1 - 5);
      });
    },

    logout() {
      Swal.fire({
        title: "Logout?",
        text: "Anda yakin ingin keluar?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Logout",
        cancelButtonText: "Batal",
      }).then(async (result) => {
        if (result.isConfirmed) {
          const refresh = localStorage.getItem("refresh_token");

          if (refresh) {
            try {
              await fetch(`${window.API_BASE_URL}/logout/`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ refresh }),
              });
            } catch (err) {
              console.warn("Gagal logout dari server:", err);
            }
          }

          // Hapus token lokal dan arahkan ke login
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "./login.html";
        }
      });
    },
  };
}

function deteksiSampah() {
  return {
    imageFile: null,
    imagePreview: null,

    handleFileChange(event) {
      const file = event.target.files[0];
      if (file) {
        this.imageFile = file;
        this.imagePreview = URL.createObjectURL(file);
      }
    },

    async checkAndRefreshToken() {
      const access = localStorage.getItem("access_token");
      const refresh = localStorage.getItem("refresh_token");

      // Tidak ada token sama sekali
      if (!access || !refresh) {
        Swal.fire("Unauthorized", "Silakan login terlebih dahulu.", "error");
        window.location.href = "./login.html";
        return null;
      }

      // Coba verifikasi access token
      const verifyRes = await fetch(`${window.API_BASE_URL}/token/verify/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: access }),
      });

      if (verifyRes.status === 200) {
        return access; // token masih valid
      }

      // Token tidak valid → coba refresh
      const refreshRes = await fetch(`${window.API_BASE_URL}/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: refresh }),
      });

      if (refreshRes.status === 200) {
        const data = await refreshRes.json();
        localStorage.setItem("access_token", data.access);
        return data.access;
      } else {
        Swal.fire("Session Expired", "Silakan login ulang.", "error");
        window.location.href = "./login.html";
        return null;
      }
    },

    async submitDetection() {
      if (!this.imageFile) {
        Swal.fire(
          "Gagal",
          "Silakan pilih atau ambil gambar terlebih dahulu.",
          "warning"
        );
        return;
      }

      const token = await this.checkAndRefreshToken();
      if (!token) return;

      const formData = new FormData();
      formData.append("image", this.imageFile);

      try {
        const response = await fetch(`${window.API_BASE_URL}/detect/image/`, {
          method: "POST",
          body: formData,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) throw new Error("Gagal memproses deteksi");

        const result = await response.json();
        localStorage.setItem("detectionResult", JSON.stringify(result));
        window.location.href = "./hasildeteksi.html";
      } catch (error) {
        console.error(error);
        Swal.fire("Error", "Terjadi kesalahan saat deteksi.", "error");
      }
    },

    logout() {
      Swal.fire({
        title: "Logout?",
        text: "Anda yakin ingin keluar?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Logout",
        cancelButtonText: "Batal",
      }).then(async (result) => {
        if (result.isConfirmed) {
          const refresh = localStorage.getItem("refresh_token");

          if (refresh) {
            try {
              await fetch(`${window.API_BASE_URL}/logout/`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ refresh }),
              });
            } catch (err) {
              console.warn("Gagal logout dari server:", err);
            }
          }

          // Hapus token lokal dan arahkan ke login
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "./login.html";
        }
      });
    },
  };
}

function detectionResult() {
  return {
    result: null,
    loadResult() {
      const token = localStorage.getItem("access_token");
      if (!token) {
        Swal.fire(
          "Unauthorized",
          "Silakan login terlebih dahulu.",
          "error"
        ).then(() => {
          window.location.href = "./login.html";
          return;
        });
      }

      const savedResult = localStorage.getItem("detectionResult");
      console.log(savedResult);
      if (!savedResult) {
        Swal.fire(
          "Data tidak ditemukan",
          "Silakan lakukan deteksi terlebih dahulu.",
          "warning"
        );
        window.location.href = "./upload.html";
        return;
      }
      this.result = JSON.parse(savedResult);
    },
    formatConfidence(conf) {
      return (conf * 100).toFixed(2) + "%";
    },
  };
}

function historiDeteksi() {
  return {
    items: [],

    async refreshToken() {
      const refresh = localStorage.getItem("refresh_token");
      if (!refresh) {
        Swal.fire("Sesi Berakhir", "Silakan login kembali.", "warning");
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "./login.html";
        return null;
      }

      try {
        const res = await fetch(`${window.API_BASE_URL}/token/refresh/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refresh }),
        });

        if (!res.ok) throw new Error("Refresh token tidak valid");

        const data = await res.json();
        localStorage.setItem("access_token", data.access);
        return data.access;
      } catch (err) {
        console.error("Gagal refresh token:", err);
        Swal.fire("Sesi Berakhir", "Silakan login kembali.", "warning");
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "./login.html";
        return null;
      }
    },

    async fetchHistory() {
      let token = localStorage.getItem("access_token");

      if (!token) {
        Swal.fire("Unauthorized", "Silakan login terlebih dahulu.", "error");
        window.location.href = "./login.html";
        return;
      }

      try {
        let response = await fetch(`${window.API_BASE_URL}/history/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401 || response.status === 403) {
          token = await this.refreshToken();
          if (!token) return;

          response = await fetch(`${window.API_BASE_URL}/history/`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        }

        if (!response.ok) throw new Error("Gagal memuat histori");

        const historyData = await response.json();

        this.items = historyData.map((item) => {
          const deteksi = item.detection;
          const waktu = new Date(deteksi.detection_time).toLocaleString(
            "id-ID",
            {
              dateStyle: "long",
              timeStyle: "short",
            }
          );

          const imageUrl = `${window.API_BASE_URL.replace(
            /\/api\/?$/,
            ""
          )}/media/${deteksi.result_image_path.replace(/\\/g, "/")}`;

          return {
            id: item.id,
            image: imageUrl,
            label: deteksi.label.label,
            confidence: Math.round(deteksi.total_confidence * 100),
            timestamp: waktu,
            description: deteksi.label.description || "-",
            mitigation: deteksi.label.mitigation || "-",
            expanded: false, //
          };
        });
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Terjadi kesalahan saat memuat histori.", "error");
      }
    },

    lihatDetail(item) {
      localStorage.setItem("selectedHistory", JSON.stringify(item));
      window.location.href = "./detail.html";
    },

    async hapusItem(item) {
      const konfirmasi = await Swal.fire({
        title: "Hapus Histori?",
        text: "Data ini akan dihapus permanen.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Hapus",
        cancelButtonText: "Batal",
      });

      if (konfirmasi.isConfirmed) {
        const token = localStorage.getItem("access_token");
        try {
          const res = await fetch(
            `${window.API_BASE_URL}/detect/delete/${item.id}/`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (!res.ok) throw new Error("Gagal menghapus");

          this.items = this.items.filter((i) => i.id !== item.id);

          Swal.fire("Berhasil", "Data telah dihapus.", "success");
        } catch (err) {
          console.error(err);
          Swal.fire("Gagal", "Tidak dapat menghapus data.", "error");
        }
      }
    },

    logout() {
      Swal.fire({
        title: "Logout?",
        text: "Anda yakin ingin keluar?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Logout",
        cancelButtonText: "Batal",
      }).then(async (result) => {
        if (result.isConfirmed) {
          const refresh = localStorage.getItem("refresh_token");

          if (refresh) {
            try {
              await fetch(`${window.API_BASE_URL}/logout/`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ refresh }),
              });
            } catch (err) {
              console.warn("Gagal logout dari server:", err);
            }
          }

          // Hapus token lokal dan arahkan ke login
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "./login.html";
        }
      });
    },

    init() {
      this.fetchHistory();
    },
  };
}
